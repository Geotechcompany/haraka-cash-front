import {
  ASSESSMENT_STEP_IDS,
  ASSESSMENT_STEPS,
  type AssessmentStepId,
  type AssessmentStepResult,
  type AssessmentStepStatus,
} from "@/lib/assessment-steps";

export type AssessmentDecisionHint = "approve" | "decline" | "manual_review";

export type RawAiAssessment = {
  steps: AssessmentStepResult[];
  overallScore: number;
  eligible: boolean;
  decisionHint: AssessmentDecisionHint;
  notes?: string;
};

export type ClampedAssessmentDecision = {
  approved: boolean;
  status: "Approved" | "Declined";
  eligibilityScore: number;
  eligible: boolean;
  decisionHint: AssessmentDecisionHint;
  notes?: string;
  steps: AssessmentStepResult[];
  policyBlocked: boolean;
};

export type PolicyClampInput = {
  amount: number;
  minLoanAmount: number;
  maxLoanAmount: number;
  automatedApprovals: boolean;
  baselineEligibilityScore: number;
  ai: RawAiAssessment | null;
};

function stepLabel(id: AssessmentStepId): string {
  const index = ASSESSMENT_STEP_IDS.indexOf(id);
  return index >= 0 ? ASSESSMENT_STEPS[index]! : id;
}

/** Deterministic step results when AI is unavailable. */
export function buildLocalAssessmentSteps(approved: boolean): AssessmentStepResult[] {
  return ASSESSMENT_STEP_IDS.map((id, index) => {
    if (approved) {
      return { id, status: "passed" as const };
    }
    // Soft-fail late scoring / eligibility steps so early checks still look complete.
    if (index >= ASSESSMENT_STEP_IDS.length - 3) {
      return {
        id,
        status: "failed" as const,
        note: `${stepLabel(id)} did not meet lending policy.`,
      };
    }
    return { id, status: "passed" as const };
  });
}

export function normalizeAssessmentSteps(
  steps: Array<{ id: string; status: string; note?: string }> | undefined,
): AssessmentStepResult[] {
  const byId = new Map(
    (steps ?? []).map((step) => [step.id, step] as const),
  );

  return ASSESSMENT_STEP_IDS.map((id) => {
    const raw = byId.get(id);
    const status: AssessmentStepStatus =
      raw?.status === "failed" || raw?.status === "review" || raw?.status === "passed"
        ? raw.status
        : "review";
    const note = raw?.note?.trim();
    return note ? { id, status, note: note.slice(0, 160) } : { id, status };
  });
}

/**
 * Hard policy always wins: AI cannot approve when automatedApprovals is off
 * or the requested amount is outside the configured loan band.
 */
export function clampAssessmentDecision(input: PolicyClampInput): ClampedAssessmentDecision {
  const withinBand =
    input.amount >= input.minLoanAmount && input.amount <= input.maxLoanAmount;
  const policyAllowsAuto = input.automatedApprovals && withinBand;
  const policyBlocked = !policyAllowsAuto;

  if (!input.ai) {
    const approved = policyAllowsAuto;
    const eligibilityScore = approved
      ? Math.min(95, input.baselineEligibilityScore + 8)
      : Math.max(25, input.baselineEligibilityScore - 15);
    return {
      approved,
      status: approved ? "Approved" : "Declined",
      eligibilityScore,
      eligible: approved,
      decisionHint: approved ? "approve" : "decline",
      notes: approved
        ? undefined
        : policyBlocked
          ? "Outside automated lending policy."
          : undefined,
      steps: buildLocalAssessmentSteps(approved),
      policyBlocked,
    };
  }

  const steps = normalizeAssessmentSteps(input.ai.steps);
  const aiWantsApprove = input.ai.eligible && input.ai.decisionHint === "approve";
  const approved = policyAllowsAuto && aiWantsApprove;

  let decisionHint: AssessmentDecisionHint = input.ai.decisionHint;
  if (policyBlocked) {
    decisionHint = "decline";
  } else if (!approved && decisionHint === "approve") {
    decisionHint = "decline";
  }

  const scoreFromAi = Math.round(
    Math.min(100, Math.max(0, Number.isFinite(input.ai.overallScore) ? input.ai.overallScore : 50)),
  );
  const eligibilityScore = approved
    ? Math.min(95, Math.max(scoreFromAi, input.baselineEligibilityScore + 4))
    : Math.max(25, Math.min(scoreFromAi, input.baselineEligibilityScore - 8));

  const notes =
    input.ai.notes?.trim().slice(0, 280) ||
    (policyBlocked ? "Outside automated lending policy." : undefined);

  return {
    approved,
    status: approved ? "Approved" : "Declined",
    eligibilityScore,
    eligible: approved,
    decisionHint,
    notes,
    steps: approved
      ? steps.map((step) =>
          step.status === "failed" ? { ...step, status: "review" as const } : step,
        )
      : steps,
    policyBlocked,
  };
}
