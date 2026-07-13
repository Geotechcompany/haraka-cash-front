import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AFFORDABLE_PAYMENT_SHARE_OF_DISPOSABLE,
  applyRealisticAmountJitter,
  buildLocalAssessmentSteps,
  clampApprovedAmount,
  clampAssessmentDecision,
  computeAffordabilityCeiling,
  computeDisposableIncome,
  computeMaxAffordableMonthlyPayment,
  computeRequestPercentCap,
  normalizeAssessmentSteps,
  PARTIAL_APPROVAL_RATIO,
  resolveAffordableApprovedAmount,
  resolveApprovedOfferAmount,
  resolveLocalApprovedAmount,
  suggestPartialApprovedAmount,
} from "@/lib/assessment-policy";
import { ASSESSMENT_STEP_IDS, ASSESSMENT_STEPS } from "@/lib/assessment-steps";
import { aiAssessmentSchema, normalizeAiAssessmentPayload } from "@/server/assessment-ai.server";
import { aiProviderOrder } from "@/server/ai-provider.server";

function isNonRoundAmount(n: number): boolean {
  return n % 100 !== 0 && n % 500 !== 0;
}

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
  const seed = "HC-TEST-001";

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

  it("jitter is deterministic and non-round", () => {
    const a = applyRealisticAmountJitter(12_000, seed);
    const b = applyRealisticAmountJitter(12_000, seed);
    assert.equal(a, b);
    assert.ok(isNonRoundAmount(a));
  });

  it("offers partial non-round amount for a tight financial profile", () => {
    const ceiling = computeAffordabilityCeiling({
      profile: tightProfile,
      ...band,
      ...quoteOpts,
    });
    assert.ok(ceiling >= 13_300 && ceiling <= 13_500, `ceiling was ${ceiling}`);

    const offer = resolveApprovedOfferAmount({
      amount: 20_000,
      ...band,
      ...tightProfile,
      ...quoteOpts,
      offerSeed: seed,
    });
    assert.ok(offer >= band.minLoanAmount);
    assert.ok(offer < 20_000);
    assert.ok(isNonRoundAmount(offer));
    assert.equal(
      resolveLocalApprovedAmount({
        amount: 20_000,
        ...band,
        ...tightProfile,
        ...quoteOpts,
        offerSeed: seed,
      }),
      offer,
    );
  });

  it("caps strong profiles below full request with non-round offer", () => {
    const offer = resolveApprovedOfferAmount({
      amount: 20_000,
      ...band,
      ...strongProfile,
      ...quoteOpts,
      offerSeed: seed,
    });
    assert.ok(offer >= band.minLoanAmount);
    assert.ok(offer < 20_000);
    assert.ok(isNonRoundAmount(offer));
    const pctCap = computeRequestPercentCap(20_000, seed);
    assert.ok(offer <= pctCap + 100);
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
    assert.equal(
      clampApprovedAmount({
        candidate: 80_000,
        requestedAmount: 250_000,
        minLoanAmount: 1_000,
        maxLoanAmount: 100_000,
      }),
      80_000,
    );
  });

  it("still offers min loan when affordability ceiling is below min loan", () => {
    const offer = resolveLocalApprovedAmount({
      amount: 20_000,
      minLoanAmount: 1_000,
      maxLoanAmount: 100_000,
      monthlyIncome: 8_000,
      monthlyExpenses: 7_500,
      rentMortgage: 0,
      existingLoans: 0,
      months: 3,
      monthlyInterestRatePercent: 6,
      offerSeed: seed,
    });
    assert.ok(offer >= 1_000);
    assert.ok(offer < 20_000);
  });

  it("resolveAffordableApprovedAmount returns unrounded affordable cap", () => {
    const offer = resolveAffordableApprovedAmount({
      amount: 20_000,
      ...band,
      ...tightProfile,
      ...quoteOpts,
    });
    assert.ok(offer >= 13_300 && offer <= 13_500);
  });
});

describe("clampAssessmentDecision", () => {
  const base = {
    amount: 20_000,
    minLoanAmount: 1_000,
    maxLoanAmount: 100_000,
    automatedApprovals: true,
    baselineEligibilityScore: 60,
    offerSeed: "HC-TEST-002",
  };

  it("always approves with deterministic local rules when AI is null", () => {
    const decision = clampAssessmentDecision({ ...base, ai: null });
    assert.equal(decision.approved, true);
    assert.equal(decision.status, "Approved");
    assert.ok(decision.approvedAmount >= base.minLoanAmount);
    assert.ok(decision.approvedAmount <= base.amount);
    assert.ok(isNonRoundAmount(decision.approvedAmount));
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
    assert.ok(decision.approvedAmount < 20_000);
    assert.equal(decision.isPartialOffer, true);
  });

  it("still approves when automatedApprovals is off", () => {
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
    assert.equal(decision.approved, true);
    assert.ok(decision.approvedAmount > 0);
    assert.equal(decision.policyBlocked, true);
    assert.equal(decision.decisionHint, "approve");
  });

  it("still approves above max loan band", () => {
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
    assert.equal(decision.approved, true);
    assert.ok(decision.approvedAmount <= base.maxLoanAmount);
    assert.equal(decision.policyBlocked, true);
  });

  it("overrides AI decline to approve with low offer", () => {
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
    assert.equal(decision.approved, true);
    assert.ok(decision.approvedAmount > 0);
    assert.ok(decision.approvedAmount < base.amount);
    assert.equal(decision.decisionHint, "approve");
  });

  it("approves when AI says approve", () => {
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
    assert.ok(decision.approvedAmount < base.amount);
    assert.ok(decision.eligibilityScore >= 64);
  });

  it("ignores AI offer amount and uses policy offer sizing", () => {
    const decision = clampAssessmentDecision({
      ...base,
      ai: {
        steps: buildLocalAssessmentSteps(true),
        overallScore: 70,
        eligible: true,
        decisionHint: "approve",
        approvedAmount: 19_000,
      },
    });
    assert.equal(decision.approved, true);
    assert.ok(decision.approvedAmount < 19_000);
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
      approvedAmount: 12_350,
      notes: "Affordable relative to income",
    });
    assert.equal(payload.overallScore, 77);
    assert.equal(payload.approvedAmount, 12_350);
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
