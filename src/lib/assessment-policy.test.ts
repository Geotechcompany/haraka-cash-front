import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildLocalAssessmentSteps,
  clampApprovedAmount,
  clampAssessmentDecision,
  normalizeAssessmentSteps,
  PARTIAL_APPROVAL_RATIO,
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

describe("partial approval heuristic", () => {
  it("rounds 67% of 20_000 to 13_400", () => {
    assert.equal(PARTIAL_APPROVAL_RATIO, 0.67);
    assert.equal(suggestPartialApprovedAmount(20_000), 13_400);
    assert.equal(
      resolveLocalApprovedAmount({
        amount: 20_000,
        minLoanAmount: 1_000,
        maxLoanAmount: 100_000,
        monthlyIncome: 8_000,
        monthlyExpenses: 7_000,
        existingLoans: 0,
        months: 3,
        monthlyInterestRatePercent: 6,
      }),
      13_400,
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

  it("keeps full request when income can afford it", () => {
    assert.equal(
      resolveLocalApprovedAmount({
        amount: 20_000,
        minLoanAmount: 1_000,
        maxLoanAmount: 100_000,
        monthlyIncome: 80_000,
        monthlyExpenses: 10_000,
        existingLoans: 0,
        months: 3,
        monthlyInterestRatePercent: 6,
      }),
      20_000,
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

  it("offers 67% partial when local affordability fails", () => {
    const decision = clampAssessmentDecision({
      ...base,
      monthlyIncome: 8_000,
      monthlyExpenses: 7_000,
      months: 3,
      monthlyInterestRatePercent: 6,
      ai: null,
    });
    assert.equal(decision.approved, true);
    assert.equal(decision.approvedAmount, 13_400);
    assert.equal(decision.isPartialOffer, true);
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
