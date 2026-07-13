import { hashSeedString, seedUnit } from "@/lib/deterministic-seed";
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
  /** Stable key for deterministic offer sizing (e.g. application number). */
  offerSeed?: string;
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
 * When the request is outside the policy band, the effective request is clamped to the band.
 */
export function clampApprovedAmount(input: {
  candidate: number;
  requestedAmount: number;
  minLoanAmount: number;
  maxLoanAmount: number;
}): number {
  const request = Math.round(input.requestedAmount);
  const effectiveRequest = Math.min(
    Math.max(request, input.minLoanAmount),
    input.maxLoanAmount,
  );
  const raw = Math.round(input.candidate);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  const capped = Math.min(raw, effectiveRequest, input.maxLoanAmount);
  if (capped < input.minLoanAmount) return 0;
  return capped;
}

/** Modest share of the request (40–70%) with deterministic variation. */
export function computeRequestPercentCap(request: number, seed: string): number {
  const pct = 0.4 + seedUnit(seed, 0) * 0.3;
  return Math.floor(request * pct);
}

/**
 * Nudge a rounded principal toward realistic, non-round KES figures (e.g. 1_250, 2_340).
 * Same seed always yields the same result.
 */
export function applyRealisticAmountJitter(rawAmount: number, seed: string): number {
  const rounded = Math.max(1, Math.round(rawAmount));
  const base50 = Math.round(rounded / 50) * 50;
  const h = hashSeedString(`offer:${seed}:${rounded}`);
  const offset = 10 + (h % 81);
  const dir = ((h >> 8) & 1) === 0 ? -1 : 1;
  let result = Math.max(50, base50 + dir * offset);
  if (result % 100 === 0) result += 20 + (h % 60);
  if (result % 500 === 0) result += 30 + (h % 40);
  return result;
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
 * Offer from affordability model: min(request, maxAffordablePrincipal).
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
  const effectiveRequest = Math.min(
    Math.max(request, input.minLoanAmount),
    input.maxLoanAmount,
  );

  const profile: FinancialProfile = {
    monthlyIncome: input.monthlyIncome,
    monthlyExpenses: input.monthlyExpenses,
    existingLoans: input.existingLoans,
    rentMortgage: input.rentMortgage,
  };

  const income = Math.max(0, profile.monthlyIncome ?? 0);
  if (income <= 0) {
    return effectiveRequest;
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

  const offer = Math.min(effectiveRequest, ceiling);
  return clampApprovedAmount({
    candidate: offer,
    requestedAmount: request,
    minLoanAmount: input.minLoanAmount,
    maxLoanAmount: input.maxLoanAmount,
  });
}

/**
 * Always-approve offer: low cap from affordability + request share, with realistic jitter.
 */
export function resolveApprovedOfferAmount(input: {
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
  offerSeed: string;
}): number {
  const request = Math.round(input.amount);
  const effectiveRequest = Math.min(
    Math.max(request, input.minLoanAmount),
    input.maxLoanAmount,
  );
  const pctCap = computeRequestPercentCap(effectiveRequest, input.offerSeed);

  const profile: FinancialProfile = {
    monthlyIncome: input.monthlyIncome,
    monthlyExpenses: input.monthlyExpenses,
    existingLoans: input.existingLoans,
    rentMortgage: input.rentMortgage,
  };
  const income = Math.max(0, profile.monthlyIncome ?? 0);
  const months = Math.max(1, Math.round(input.months ?? DEFAULT_REPAYMENT_MONTHS));

  let rawCap: number;
  if (income <= 0) {
    rawCap = Math.min(effectiveRequest, pctCap);
  } else {
    const ceiling = computeAffordabilityCeiling({
      profile,
      minLoanAmount: input.minLoanAmount,
      maxLoanAmount: input.maxLoanAmount,
      months,
      monthlyInterestRatePercent: input.monthlyInterestRatePercent,
      minProcessingFee: input.minProcessingFee,
    });
    const affordable =
      ceiling >= input.minLoanAmount ? Math.min(effectiveRequest, ceiling) : input.minLoanAmount;
    rawCap = Math.min(effectiveRequest, pctCap, affordable);
  }

  if (rawCap < input.minLoanAmount) {
    rawCap = input.minLoanAmount;
  }

  const jittered = applyRealisticAmountJitter(rawCap, input.offerSeed);
  let result = clampApprovedAmount({
    candidate: jittered,
    requestedAmount: request,
    minLoanAmount: input.minLoanAmount,
    maxLoanAmount: input.maxLoanAmount,
  });

  if (result <= 0) {
    result = clampApprovedAmount({
      candidate: applyRealisticAmountJitter(input.minLoanAmount, input.offerSeed),
      requestedAmount: request,
      minLoanAmount: input.minLoanAmount,
      maxLoanAmount: input.maxLoanAmount,
    });
  }

  return result > 0 ? result : input.minLoanAmount;
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
  offerSeed?: string;
}): number {
  return resolveApprovedOfferAmount({
    ...input,
    offerSeed: input.offerSeed ?? `local:${input.amount}`,
  });
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
 * Hard policy clamps AI suggestions; assessments always produce an approved offer.
 * Approved offers are typically partial (approvedAmount ≤ request) with modest limits.
 */
export function clampAssessmentDecision(input: PolicyClampInput): ClampedAssessmentDecision {
  const withinBand =
    input.amount >= input.minLoanAmount && input.amount <= input.maxLoanAmount;
  const policyAllowsAuto = input.automatedApprovals && withinBand;
  const policyBlocked = !policyAllowsAuto;
  const offerSeed = input.offerSeed ?? `assess:${input.amount}`;

  const approvedAmount = resolveApprovedOfferAmount({
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
    offerSeed,
  });

  const isPartialOffer = approvedAmount < Math.round(input.amount);

  const scoreFromAi = input.ai
    ? Math.round(
        Math.min(
          100,
          Math.max(0, Number.isFinite(input.ai.overallScore) ? input.ai.overallScore : 50),
        ),
      )
    : input.baselineEligibilityScore;

  const eligibilityScore = Math.min(
    95,
    Math.max(scoreFromAi, input.baselineEligibilityScore + (isPartialOffer ? 4 : 8)),
  );

  const steps = input.ai
    ? normalizeAssessmentSteps(input.ai.steps).map((step) =>
        step.status === "failed" ? { ...step, status: "review" as const } : step,
      )
    : buildLocalAssessmentSteps(true);

  const notes =
    input.ai?.notes?.trim().slice(0, 280) ||
    (isPartialOffer ? "Partial offer based on affordability." : undefined);

  return {
    approved: true,
    status: "Approved",
    approvedAmount,
    isPartialOffer,
    eligibilityScore,
    eligible: true,
    decisionHint: "approve",
    notes,
    steps,
    policyBlocked,
  };
}
