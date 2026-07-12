import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AFFORDABLE_PAYMENT_SHARE_OF_DISPOSABLE,
  buildLocalAssessmentSteps,
  clampApprovedAmount,
  clampAssessmentDecision,
  computeAffordabilityCeiling,
  computeDisposableIncome,
  computeMaxAffordableMonthlyPayment,
  normalizeAssessmentSteps,
  PARTIAL_APPROVAL_RATIO,
  resolveAffordableApprovedAmount,
  resolveLocalApprovedAmount,
  suggestPartialApprovedAmount,
} from "@/lib/assessment-policy";
import { ASSESSMENT_STEP_IDS, ASSESSMENT_STEPS } from "@/lib/assessment-steps";
import { aiAssessmentSchema, normalizeAiAssessmentPayload } from "@/server/assessment-ai.server";
import { aiProviderOrder } from "@/server/ai-provider.server";

describe("assessment step catalog", () => {
  it("keeps step ids aligned with UI labels", () => {
    assert.equal(ASSESSMENT_STEP_IDS.length, ASSESSMENT_STEPS.length);
    assert.equal(ASSESSMENT_STEP_IDS[0], "identity");
    assert.equal(ASSESSMENT_STEPS.at(-1), "Determining Eligibility");
  });
});

describe("aiProviderOrder", () => {
  it("matches quote provider resolution", () => {
    assert.deepEqual(aiProviderOrder("auto"), ["gemini", "openai", "nvidia"]);
    assert.deepEqual(aiProviderOrder("openai"), ["openai", "gemini", "nvidia"]);
    assert.deepEqual(aiProviderOrder("gemini"), ["gemini", "openai", "nvidia"]);
    assert.deepEqual(aiProviderOrder("nvidia"), ["nvidia", "gemini", "openai"]);
    assert.deepEqual(aiProviderOrder("off"), []);
  });
});

describe("normalizeAssessmentSteps", () => {
  it("fills missing ids and clamps statuses", () => {
    const steps = normalizeAssessmentSteps([
      { id: "identity", status: "passed" },
      { id: "income", status: "weird", note: "  thin income  " },
    ]);
    assert.equal(steps.length, ASSESSMENT_STEP_IDS.length);
    assert.equal(steps[0]?.status, "passed");
    const income = steps.find((step) => step.id === "income");
    assert.equal(income?.status, "review");
    assert.equal(income?.note, "thin income");
  });
});

describe("affordability model", () => {
  const quoteOpts = { months: 3, monthlyInterestRatePercent: 6 } as const;
  const band = { minLoanAmount: 1_000, maxLoanAmount: 100_000 } as const;

  /** Tight but viable: can service ~13.4k/mo payment, not full 20k. */
  const tightProfile = {
    monthlyIncome: 25_500,
    monthlyExpenses: 8_000,
    rentMortgage: 1_950,
    existingLoans: 0,
  };

  const strongProfile = {
    monthlyIncome: 300_000,
    monthlyExpenses: 30_000,
    rentMortgage: 0,
    existingLoans: 0,
  };

  it("computes disposable income with rent and debt service", () => {
    assert.equal(
      computeDisposableIncome({
        monthlyIncome: 25_500,
        monthlyExpenses: 8_000,
        rentMortgage: 1_950,
        existingLoans: 20_000,
      }),
      14_550,
    );
    assert.equal(
      computeMaxAffordableMonthlyPayment({
        monthlyIncome: 25_500,
        monthlyExpenses: 8_000,
        rentMortgage: 1_950,
        existingLoans: 0,
      }),
      Math.floor(15_550 * AFFORDABLE_PAYMENT_SHARE_OF_DISPOSABLE),
    );
  });

  it("rounds legacy 67% heuristic to 13_400", () => {
    assert.equal(PARTIAL_APPROVAL_RATIO, 0.67);
    assert.equal(suggestPartialApprovedAmount(20_000), 13_400);
  });

  it("offers ~13_400 partial for a tight financial profile", () => {
    const ceiling = computeAffordabilityCeiling({
      profile: tightProfile,
      ...band,
      ...quoteOpts,
    });
    assert.ok(ceiling >= 13_300 && ceiling <= 13_500, `ceiling was ${ceiling}`);

    const offer = resolveAffordableApprovedAmount({
      amount: 20_000,
      ...band,
      ...tightProfile,
      ...quoteOpts,
    });
    assert.equal(offer, 13_400);
    assert.equal(
      resolveLocalApprovedAmount({
        amount: 20_000,
        ...band,
        ...tightProfile,
        ...quoteOpts,
      }),
      13_400,
    );
  });

  it("approves full request for a strong financial profile", () => {
    assert.equal(
      resolveAffordableApprovedAmount({
        amount: 20_000,
        ...band,
        ...strongProfile,
        ...quoteOpts,
      }),
      20_000,
    );
    assert.equal(
      resolveLocalApprovedAmount({
        amount: 20_000,
        ...band,
        ...strongProfile,
        ...quoteOpts,
      }),
      20_000,
    );
  });

  it("clamps offers to request and policy band", () => {
    assert.equal(
      clampApprovedAmount({
        candidate: 50_000,
        requestedAmount: 20_000,
        minLoanAmount: 1_000,
        maxLoanAmount: 100_000,
      }),
      20_000,
    );
    assert.equal(
      clampApprovedAmount({
        candidate: 500,
        requestedAmount: 20_000,
        minLoanAmount: 1_000,
        maxLoanAmount: 100_000,
      }),
      0,
    );
  });

  it("declines when affordability ceiling is below min loan", () => {
    assert.equal(
      resolveLocalApprovedAmount({
        amount: 20_000,
        minLoanAmount: 1_000,
        maxLoanAmount: 100_000,
        monthlyIncome: 8_000,
        monthlyExpenses: 7_500,
        rentMortgage: 0,
        existingLoans: 0,
        months: 3,
        monthlyInterestRatePercent: 6,
      }),
      0,
    );
  });
});

describe("clampAssessmentDecision", () => {
  const base = {
    amount: 20_000,
    minLoanAmount: 1_000,
    maxLoanAmount: 100_000,
    automatedApprovals: true,
    baselineEligibilityScore: 60,
  };

  it("uses deterministic local rules when AI is null", () => {
    const decision = clampAssessmentDecision({ ...base, ai: null });
    assert.equal(decision.approved, true);
    assert.equal(decision.status, "Approved");
    assert.equal(decision.approvedAmount, 20_000);
    assert.equal(decision.isPartialOffer, false);
    assert.equal(decision.steps.length, ASSESSMENT_STEP_IDS.length);
    assert.ok(decision.steps.every((step) => step.status === "passed"));
  });

  it("offers partial when local affordability is tight", () => {
    const decision = clampAssessmentDecision({
      ...base,
      monthlyIncome: 25_500,
      monthlyExpenses: 8_000,
      rentMortgage: 1_950,
      existingLoans: 0,
      months: 3,
      monthlyInterestRatePercent: 6,
      ai: null,
    });
    assert.equal(decision.approved, true);
    assert.equal(decision.approvedAmount, 13_400);
    assert.equal(decision.isPartialOffer, true);
  });

  it("approves full request for strong local affordability", () => {
    const decision = clampAssessmentDecision({
      ...base,
      monthlyIncome: 300_000,
      monthlyExpenses: 30_000,
      rentMortgage: 0,
      existingLoans: 0,
      months: 3,
      monthlyInterestRatePercent: 6,
      ai: null,
    });
    assert.equal(decision.approved, true);
    assert.equal(decision.approvedAmount, 20_000);
    assert.equal(decision.isPartialOffer, false);
  });

  it("blocks approval when automatedApprovals is off", () => {
    const decision = clampAssessmentDecision({
      ...base,
      automatedApprovals: false,
      ai: {
        steps: buildLocalAssessmentSteps(true),
        overallScore: 90,
        eligible: true,
        decisionHint: "approve",
        approvedAmount: 20_000,
        notes: "Looks strong",
      },
    });
    assert.equal(decision.approved, false);
    assert.equal(decision.approvedAmount, 0);
    assert.equal(decision.policyBlocked, true);
    assert.equal(decision.decisionHint, "decline");
  });

  it("blocks approval above max loan even if AI approves", () => {
    const decision = clampAssessmentDecision({
      ...base,
      amount: 250_000,
      ai: {
        steps: buildLocalAssessmentSteps(true),
        overallScore: 95,
        eligible: true,
        decisionHint: "approve",
        approvedAmount: 250_000,
      },
    });
    assert.equal(decision.approved, false);
    assert.equal(decision.approvedAmount, 0);
    assert.equal(decision.policyBlocked, true);
  });

  it("honours AI decline inside policy", () => {
    const decision = clampAssessmentDecision({
      ...base,
      ai: {
        steps: buildLocalAssessmentSteps(false),
        overallScore: 40,
        eligible: false,
        decisionHint: "decline",
        approvedAmount: 0,
        notes: "Income too tight",
      },
    });
    assert.equal(decision.approved, false);
    assert.equal(decision.approvedAmount, 0);
    assert.equal(decision.policyBlocked, false);
    assert.equal(decision.notes, "Income too tight");
  });

  it("approves only when policy allows and AI says approve", () => {
    const decision = clampAssessmentDecision({
      ...base,
      ai: {
        steps: buildLocalAssessmentSteps(true),
        overallScore: 82,
        eligible: true,
        decisionHint: "approve",
        approvedAmount: 20_000,
      },
    });
    assert.equal(decision.approved, true);
    assert.equal(decision.status, "Approved");
    assert.equal(decision.approvedAmount, 20_000);
    assert.ok(decision.eligibilityScore >= 64);
  });

  it("clamps AI partial offer to request and band", () => {
    const decision = clampAssessmentDecision({
      ...base,
      ai: {
        steps: buildLocalAssessmentSteps(true),
        overallScore: 70,
        eligible: true,
        decisionHint: "approve",
        approvedAmount: 13_400,
      },
    });
    assert.equal(decision.approved, true);
    assert.equal(decision.approvedAmount, 13_400);
    assert.equal(decision.isPartialOffer, true);
  });

  it("rejects AI offer above the request", () => {
    const decision = clampAssessmentDecision({
      ...base,
      ai: {
        steps: buildLocalAssessmentSteps(true),
        overallScore: 88,
        eligible: true,
        decisionHint: "approve",
        approvedAmount: 50_000,
      },
    });
    assert.equal(decision.approved, true);
    assert.equal(decision.approvedAmount, 20_000);
    assert.equal(decision.isPartialOffer, false);
  });

  it("clamps AI full approval to affordability ceiling", () => {
    const decision = clampAssessmentDecision({
      ...base,
      monthlyIncome: 25_500,
      monthlyExpenses: 8_000,
      rentMortgage: 1_950,
      months: 3,
      monthlyInterestRatePercent: 6,
      ai: {
        steps: buildLocalAssessmentSteps(true),
        overallScore: 82,
        eligible: true,
        decisionHint: "approve",
        approvedAmount: 20_000,
      },
    });
    assert.equal(decision.approved, true);
    assert.equal(decision.approvedAmount, 13_400);
    assert.equal(decision.isPartialOffer, true);
  });
});

describe("aiAssessmentSchema", () => {
  it("parses a valid AI payload", () => {
    const payload = aiAssessmentSchema.parse({
      steps: ASSESSMENT_STEP_IDS.map((id) => ({ id, status: "passed" })),
      overallScore: 77,
      eligible: true,
      decisionHint: "approve",
      approvedAmount: 13_400,
      notes: "Affordable relative to income",
    });
    assert.equal(payload.overallScore, 77);
    assert.equal(payload.approvedAmount, 13_400);
    assert.equal(payload.steps.length, ASSESSMENT_STEP_IDS.length);
  });

  it("rejects invalid decision hints", () => {
    assert.throws(() =>
      aiAssessmentSchema.parse({
        steps: [{ id: "identity", status: "passed" }],
        overallScore: 50,
        eligible: false,
        decisionHint: "maybe",
      }),
    );
  });

  it("normalizes review alias to manual_review", () => {
    const normalized = normalizeAiAssessmentPayload({
      steps: [{ id: "identity", status: "passed" }],
      overallScore: 50,
      eligible: true,
      decisionHint: "review",
      approvedAmount: 13400.6,
    });
    const payload = aiAssessmentSchema.parse(normalized);
    assert.equal(payload.decisionHint, "manual_review");
    assert.equal(payload.approvedAmount, 13_401);
  });
});
