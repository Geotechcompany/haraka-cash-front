import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildLocalAssessmentSteps,
  clampAssessmentDecision,
  normalizeAssessmentSteps,
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
    assert.equal(decision.steps.length, ASSESSMENT_STEP_IDS.length);
    assert.ok(decision.steps.every((step) => step.status === "passed"));
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
        notes: "Looks strong",
      },
    });
    assert.equal(decision.approved, false);
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
      },
    });
    assert.equal(decision.approved, false);
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
        notes: "Income too tight",
      },
    });
    assert.equal(decision.approved, false);
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
      },
    });
    assert.equal(decision.approved, true);
    assert.equal(decision.status, "Approved");
    assert.ok(decision.eligibilityScore >= 64);
  });
});

describe("aiAssessmentSchema", () => {
  it("parses a valid AI payload", () => {
    const payload = aiAssessmentSchema.parse({
      steps: ASSESSMENT_STEP_IDS.map((id) => ({ id, status: "passed" })),
      overallScore: 77,
      eligible: true,
      decisionHint: "approve",
      notes: "Affordable relative to income",
    });
    assert.equal(payload.overallScore, 77);
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
    });
    const payload = aiAssessmentSchema.parse(normalized);
    assert.equal(payload.decisionHint, "manual_review");
  });
});
