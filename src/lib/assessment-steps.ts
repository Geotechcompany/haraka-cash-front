/** Stable IDs for AI assessment steps — index-aligned with ASSESSMENT_STEPS labels. */
export const ASSESSMENT_STEP_IDS = [
  "identity",
  "applicationReview",
  "employment",
  "income",
  "existingLoans",
  "repayment",
  "credit",
  "risk",
  "rules",
  "score",
  "eligibility",
] as const;

export type AssessmentStepId = (typeof ASSESSMENT_STEP_IDS)[number];

export const ASSESSMENT_STEPS = [
  "Identity Verification",
  "Application Review",
  "Employment Check",
  "Income Assessment",
  "Existing Loans Check",
  "Repayment Behaviour",
  "Credit Assessment",
  "Risk Indicators",
  "Internal Rules Engine",
  "Calculating Score",
  "Determining Eligibility",
] as const;

export type AssessmentStepLabel = (typeof ASSESSMENT_STEPS)[number];

export type AssessmentStepStatus = "passed" | "failed" | "review";

export type AssessmentStepResult = {
  id: AssessmentStepId;
  status: AssessmentStepStatus;
  note?: string;
};
