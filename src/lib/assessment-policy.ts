import {
  ASSESSMENT_STEP_IDS,
  ASSESSMENT_STEPS,
  type AssessmentStepId,
  type AssessmentStepResult,
  type AssessmentStepStatus,
} from "@/lib/assessment-steps";
import { buildLoanQuote, MONTHLY_INTEREST } from "@/lib/loan";
import { DEFAULT_REPAYMENT_MONTHS } from "@/lib/lending-products";

export type AssessmentDecisionHint = "approve" | "decline" | "manual_review";

/** @deprecated Legacy 67% partial heuristic — kept for tests referencing the old fallback. */
export const PARTIAL_APPROVAL_RATIO = 0.67;

/**
 * Estimated monthly debt service on outstanding loan balances (5% of principal).
 * Used when applicants report total existing loan exposure in KES.
 */
export const EXISTING_LOAN_MONTHLY_SERVICE_FACTOR = 0.05;

/**
 * Share of disposable income allocated to the new HarakaCash monthly payment.
 * 35% sits in the common 30–40% affordability band for unsecured consumer credit.
 */
export const AFFORDABLE_PAYMENT_SHARE_OF_DISPOSABLE = 0.35;

export type RawAiAssessment = {
  steps: AssessmentStepResult[];
  overallScore: number;
  eligible: boolean;
  decisionHint: AssessmentDecisionHint;
  /** Suggested principal in KES; ignored when declining. */
  approvedAmount?: number;
  notes?: string;
};

export type ClampedAssessmentDecision = {
  approved: boolean;
  status: "Approved" | "Declined";
  /** Offered principal in KES (0 when declined). Always ≤ requested amount. */
  approvedAmount: number;
  /** True when approved and offered principal is below the request. */
  isPartialOffer: boolean;
  eligibilityScore: number;
  eligible: boolean;
  decisionHint: AssessmentDecisionHint;
  notes?: string;
  steps: AssessmentStepResult[];
  policyBlocked: boolean;
};

export type FinancialProfile = {
  monthlyIncome?: number;
  monthlyExpenses?: number;
  existingLoans?: number;
  rentMortgage?: number;
};

export type AffordabilityQuoteContext = {
  months: number;
  monthlyInterestRatePercent?: number;
  minProcessingFee?: number;
};

export type PolicyClampInput = {
  amount: number;
  minLoanAmount: number;
  maxLoanAmount: number;
  automatedApprovals: boolean;
  baselineEligibilityScore: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  existingLoans?: number;
  rentMortgage?: number;
  months?: number;
  monthlyInterestRatePercent?: number;
  minProcessingFee?: number;
  ai: RawAiAssessment | null;
};

function stepLabel(id: AssessmentStepId): string {
  const index = ASSESSMENT_STEP_IDS.indexOf(id);
  return index >= 0 ? ASSESSMENT_STEPS[index]! : id;
}

/** Round to nearest 100 KES (banknote-friendly offer sizes). */
export function roundToNearestHundred(n: number): number {
  return Math.round(n / 100) * 100;
}

/**
 * Legacy partial-offer heuristic when the full request is not affordable:
 * `round(request × 0.67 / 100) × 100` → e.g. 20_000 → 13_400.
 */
export function suggestPartialApprovedAmount(requestedAmount: number): number {
  return roundToNearestHundred(requestedAmount * PARTIAL_APPROVAL_RATIO);
}

/**
 * Clamp a candidate offer into [minLoan, min(request, maxLoan)].
 * Returns 0 when the candidate is invalid or would fall below min after clamp.
 */
export function clampApprovedAmount(input: {
  candidate: number;
  requestedAmount: number;
  minLoanAmount: number;
  maxLoanAmount: number;
}): number {
  const request = Math.round(input.requestedAmount);
  if (!(request >= input.minLoanAmount && request <= input.maxLoanAmount)) {
    return 0;
  }
  const raw = Math.round(input.candidate);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  const capped = Math.min(raw, request, input.maxLoanAmount);
  if (capped < input.minLoanAmount) return 0;
  return capped;
}

/**
 * Disposable income after living costs, housing, and existing debt service.
 *
 * `residual = income − expenses − rentMortgage − (existingLoans × 5%)`
 */
export function computeDisposableIncome(profile: FinancialProfile): number {
  const income = Math.max(0, profile.monthlyIncome ?? 0);
  const expenses = Math.max(0, profile.monthlyExpenses ?? 0);
  const rent = Math.max(0, profile.rentMortgage ?? 0);
  const existing = Math.max(0, profile.existingLoans ?? 0);
  const debtService = existing * EXISTING_LOAN_MONTHLY_SERVICE_FACTOR;
  return Math.max(0, income - expenses - rent - debtService);
}

/**
 * Max monthly payment the applicant can take on for this loan.
 * `floor(disposable × 35%)` when income is known; 0 when disposable is 0.
 */
export function computeMaxAffordableMonthlyPayment(profile: FinancialProfile): number {
  const income = Math.max(0, profile.monthlyIncome ?? 0);
  if (income <= 0) return Number.POSITIVE_INFINITY;
  const disposable = computeDisposableIncome(profile);
  return Math.floor(disposable * AFFORDABLE_PAYMENT_SHARE_OF_DISPOSABLE);
}

function quoteMonthlyForPrincipal(
  principal: number,
  quote: AffordabilityQuoteContext,
): number {
  return buildLoanQuote(principal, quote.months, {
    monthlyInterestRatePercent: quote.monthlyInterestRatePercent ?? MONTHLY_INTEREST * 100,
    minProcessingFee: quote.minProcessingFee,
  }).monthly;
}

/**
 * Highest principal (KES) whose quoted monthly payment fits within the affordability cap.
 * Binary search over [minLoan, upperBound], stepped in 100 KES increments.
 */
export function solveMaxAffordablePrincipal(input: {
  profile: FinancialProfile;
  minLoanAmount: number;
  upperBound: number;
  months: number;
  monthlyInterestRatePercent?: number;
  minProcessingFee?: number;
}): number {
  const maxPayment = computeMaxAffordableMonthlyPayment(input.profile);
  if (!Number.isFinite(maxPayment) || maxPayment <= 0) return 0;

  const quoteCtx: AffordabilityQuoteContext = {
    months: Math.max(1, Math.round(input.months)),
    monthlyInterestRatePercent: input.monthlyInterestRatePercent,
    minProcessingFee: input.minProcessingFee,
  };

  const minLoan = Math.max(100, Math.round(input.minLoanAmount));
  const cap = Math.max(minLoan, Math.round(input.upperBound));
  let lo = minLoan;
  let hi = cap;
  let best = 0;

  while (lo <= hi) {
    const mid = roundToNearestHundred(Math.round((lo + hi) / 2));
    const clampedMid = Math.max(minLoan, Math.min(cap, mid));
    const monthly = quoteMonthlyForPrincipal(clampedMid, quoteCtx);
    if (monthly <= maxPayment) {
      best = clampedMid;
      lo = clampedMid + 100;
    } else {
      hi = clampedMid - 100;
    }
  }

  return best;
}

/** Max principal the profile can service (before request / policy caps). */
export function computeAffordabilityCeiling(input: {
  profile: FinancialProfile;
  minLoanAmount: number;
  maxLoanAmount: number;
  months: number;
  monthlyInterestRatePercent?: number;
  minProcessingFee?: number;
}): number {
  const income = Math.max(0, input.profile.monthlyIncome ?? 0);
  if (income <= 0) return input.maxLoanAmount;

  return solveMaxAffordablePrincipal({
    profile: input.profile,
    minLoanAmount: input.minLoanAmount,
    upperBound: input.maxLoanAmount,
    months: input.months,
    monthlyInterestRatePercent: input.monthlyInterestRatePercent,
    minProcessingFee: input.minProcessingFee,
  });
}

/**
 * Full request is affordable when residual covers the quoted monthly payment.
 */
export function canAffordRequestedLoan(input: {
  amount: number;
  months: number;
  monthlyIncome: number;
  monthlyExpenses?: number;
  existingLoans?: number;
  rentMortgage?: number;
  monthlyInterestRatePercent?: number;
  minProcessingFee?: number;
}): boolean {
  const profile: FinancialProfile = {
    monthlyIncome: input.monthlyIncome,
    monthlyExpenses: input.monthlyExpenses,
    existingLoans: input.existingLoans,
    rentMortgage: input.rentMortgage,
  };
  const maxPayment = computeMaxAffordableMonthlyPayment(profile);
  if (!Number.isFinite(maxPayment)) return true;
  const quote = buildLoanQuote(input.amount, input.months, {
    monthlyInterestRatePercent: input.monthlyInterestRatePercent ?? MONTHLY_INTEREST * 100,
    minProcessingFee: input.minProcessingFee,
  });
  return quote.monthly <= maxPayment;
}

/**
 * Offer from affordability model: min(request, maxAffordablePrincipal), rounded to nearest 100.
 * Returns 0 when max affordable falls below minLoan.
 */
export function resolveAffordableApprovedAmount(input: {
  amount: number;
  minLoanAmount: number;
  maxLoanAmount: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  existingLoans?: number;
  rentMortgage?: number;
  months?: number;
  monthlyInterestRatePercent?: number;
  minProcessingFee?: number;
}): number {
  const request = Math.round(input.amount);
  if (!(request >= input.minLoanAmount && request <= input.maxLoanAmount)) {
    return 0;
  }

  const profile: FinancialProfile = {
    monthlyIncome: input.monthlyIncome,
    monthlyExpenses: input.monthlyExpenses,
    existingLoans: input.existingLoans,
    rentMortgage: input.rentMortgage,
  };

  const income = Math.max(0, profile.monthlyIncome ?? 0);
  if (income <= 0) {
    return request;
  }

  const months = Math.max(1, Math.round(input.months ?? DEFAULT_REPAYMENT_MONTHS));
  const ceiling = computeAffordabilityCeiling({
    profile,
    minLoanAmount: input.minLoanAmount,
    maxLoanAmount: input.maxLoanAmount,
    months,
    monthlyInterestRatePercent: input.monthlyInterestRatePercent,
    minProcessingFee: input.minProcessingFee,
  });

  if (ceiling < input.minLoanAmount) return 0;

  const offer = roundToNearestHundred(Math.min(request, ceiling));
  return clampApprovedAmount({
    candidate: offer,
    requestedAmount: request,
    minLoanAmount: input.minLoanAmount,
    maxLoanAmount: input.maxLoanAmount,
  });
}

/** Deterministic local offer when AI is unavailable. */
export function resolveLocalApprovedAmount(input: {
  amount: number;
  minLoanAmount: number;
  maxLoanAmount: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  existingLoans?: number;
  rentMortgage?: number;
  months?: number;
  monthlyInterestRatePercent?: number;
  minProcessingFee?: number;
}): number {
  return resolveAffordableApprovedAmount(input);
}

/** Apply affordability ceiling to an AI or policy candidate offer. */
export function applyAffordabilityCeiling(input: {
  candidate: number;
  amount: number;
  minLoanAmount: number;
  maxLoanAmount: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  existingLoans?: number;
  rentMortgage?: number;
  months?: number;
  monthlyInterestRatePercent?: number;
  minProcessingFee?: number;
}): number {
  const affordableCap = resolveAffordableApprovedAmount({
    amount: input.amount,
    minLoanAmount: input.minLoanAmount,
    maxLoanAmount: input.maxLoanAmount,
    monthlyIncome: input.monthlyIncome,
    monthlyExpenses: input.monthlyExpenses,
    existingLoans: input.existingLoans,
    rentMortgage: input.rentMortgage,
    months: input.months,
    monthlyInterestRatePercent: input.monthlyInterestRatePercent,
    minProcessingFee: input.minProcessingFee,
  });

  const income = Math.max(0, input.monthlyIncome ?? 0);
  const cappedCandidate =
    income > 0 ? Math.min(Math.round(input.candidate), affordableCap) : Math.round(input.candidate);

  return clampApprovedAmount({
    candidate: cappedCandidate,
    requestedAmount: input.amount,
    minLoanAmount: input.minLoanAmount,
    maxLoanAmount: input.maxLoanAmount,
  });
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
 * Approved offers may be partial (approvedAmount ≤ request).
 */
export function clampAssessmentDecision(input: PolicyClampInput): ClampedAssessmentDecision {
  const withinBand =
    input.amount >= input.minLoanAmount && input.amount <= input.maxLoanAmount;
  const policyAllowsAuto = input.automatedApprovals && withinBand;
  const policyBlocked = !policyAllowsAuto;

  if (!input.ai) {
    if (!policyAllowsAuto) {
      return {
        approved: false,
        status: "Declined",
        approvedAmount: 0,
        isPartialOffer: false,
        eligibilityScore: Math.max(25, input.baselineEligibilityScore - 15),
        eligible: false,
        decisionHint: "decline",
        notes: policyBlocked ? "Outside automated lending policy." : undefined,
        steps: buildLocalAssessmentSteps(false),
        policyBlocked,
      };
    }

    const approvedAmount = resolveLocalApprovedAmount({
      amount: input.amount,
      minLoanAmount: input.minLoanAmount,
      maxLoanAmount: input.maxLoanAmount,
      monthlyIncome: input.monthlyIncome,
      monthlyExpenses: input.monthlyExpenses,
      existingLoans: input.existingLoans,
      rentMortgage: input.rentMortgage,
      months: input.months,
      monthlyInterestRatePercent: input.monthlyInterestRatePercent,
      minProcessingFee: input.minProcessingFee,
    });
    const approved = approvedAmount > 0;
    const isPartialOffer = approved && approvedAmount < Math.round(input.amount);
    const eligibilityScore = approved
      ? Math.min(95, input.baselineEligibilityScore + (isPartialOffer ? 4 : 8))
      : Math.max(25, input.baselineEligibilityScore - 15);

    return {
      approved,
      status: approved ? "Approved" : "Declined",
      approvedAmount,
      isPartialOffer,
      eligibilityScore,
      eligible: approved,
      decisionHint: approved ? "approve" : "decline",
      notes: approved
        ? isPartialOffer
          ? "Partial offer based on affordability."
          : undefined
        : "Could not offer at least the minimum loan amount.",
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

  let approvedAmount = 0;
  if (approved) {
    const candidate =
      typeof input.ai.approvedAmount === "number" && Number.isFinite(input.ai.approvedAmount)
        ? input.ai.approvedAmount
        : input.amount;
    approvedAmount = applyAffordabilityCeiling({
      candidate,
      amount: input.amount,
      minLoanAmount: input.minLoanAmount,
      maxLoanAmount: input.maxLoanAmount,
      monthlyIncome: input.monthlyIncome,
      monthlyExpenses: input.monthlyExpenses,
      existingLoans: input.existingLoans,
      rentMortgage: input.rentMortgage,
      months: input.months,
      monthlyInterestRatePercent: input.monthlyInterestRatePercent,
      minProcessingFee: input.minProcessingFee,
    });
  }

  const stillApproved = approved && approvedAmount > 0;
  const isPartialOffer = stillApproved && approvedAmount < Math.round(input.amount);

  const notes =
    input.ai.notes?.trim().slice(0, 280) ||
    (policyBlocked
      ? "Outside automated lending policy."
      : approved && !stillApproved
        ? "Approved amount fell below the minimum loan."
        : isPartialOffer
          ? "Partial offer based on affordability."
          : undefined);

  return {
    approved: stillApproved,
    status: stillApproved ? "Approved" : "Declined",
    approvedAmount: stillApproved ? approvedAmount : 0,
    isPartialOffer,
    eligibilityScore: stillApproved
      ? eligibilityScore
      : Math.max(25, Math.min(scoreFromAi, input.baselineEligibilityScore - 8)),
    eligible: stillApproved,
    decisionHint: stillApproved ? decisionHint : "decline",
    notes,
    steps: stillApproved
      ? steps.map((step) =>
          step.status === "failed" ? { ...step, status: "review" as const } : step,
        )
      : steps,
    policyBlocked,
  };
}
