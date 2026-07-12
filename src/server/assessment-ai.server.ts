/**
 * Server-only AI assessment of loan applications.
 * Uses the same admin Gemini/OpenAI/NVIDIA key resolution and provider order as quote notes.
 *
 * Never import this module from client routes — use createServerFn wrappers only.
 */
import "@/lib/server-only";

import { z } from "zod";

import {
  ASSESSMENT_STEP_IDS,
  type AssessmentStepId,
} from "@/lib/assessment-steps";
import {
  AFFORDABLE_PAYMENT_SHARE_OF_DISPOSABLE,
  clampAssessmentDecision,
  computeAffordabilityCeiling,
  computeDisposableIncome,
  computeMaxAffordableMonthlyPayment,
  normalizeAssessmentSteps,
  type AssessmentDecisionHint,
  type ClampedAssessmentDecision,
  type RawAiAssessment,
} from "@/lib/assessment-policy";
import type { QuoteAiProvider } from "@/lib/models/settings";
import {
  aiProviderOrder,
  extractJsonObject,
  generateJsonWithGemini,
  generateJsonWithNvidia,
  generateJsonWithOpenAi,
  type AiProviderSource,
} from "@/server/ai-provider.server";

const stepStatusSchema = z.enum(["passed", "failed", "review"]);

export const aiAssessmentSchema = z.object({
  steps: z
    .array(
      z.object({
        id: z.string(),
        status: stepStatusSchema,
        note: z.string().max(160).optional(),
      }),
    )
    .min(1)
    .max(ASSESSMENT_STEP_IDS.length + 2),
  overallScore: z.number().min(0).max(100),
  eligible: z.boolean(),
  decisionHint: z.enum(["approve", "decline", "manual_review"]),
  /** Offered principal in KES; must be ≤ loanAmount and ≥ minLoanAmount when approving. */
  approvedAmount: z.number().int().nonnegative().optional(),
  notes: z.string().max(280).optional(),
});

export type AiAssessmentPayload = z.infer<typeof aiAssessmentSchema>;

/** Coerce common model aliases before strict zod parse. */
export function normalizeAiAssessmentPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const copy = { ...(raw as Record<string, unknown>) };
  const hint = copy.decisionHint;
  if (typeof hint === "string") {
    const normalized = hint.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (normalized === "review" || normalized === "manual" || normalized === "manualreview") {
      copy.decisionHint = "manual_review";
    } else if (normalized === "approved" || normalized === "accept") {
      copy.decisionHint = "approve";
    } else if (normalized === "declined" || normalized === "reject" || normalized === "rejected") {
      copy.decisionHint = "decline";
    } else {
      copy.decisionHint = normalized;
    }
  }
  if (typeof copy.notes === "string" && copy.notes.length > 280) {
    copy.notes = copy.notes.slice(0, 280);
  }
  if (copy.approvedAmount != null) {
    const n = Number(copy.approvedAmount);
    if (Number.isFinite(n)) copy.approvedAmount = Math.round(n);
  }
  return copy;
}

function parseAiAssessmentPayload(text: string): AiAssessmentPayload {
  return aiAssessmentSchema.parse(normalizeAiAssessmentPayload(extractJsonObject(text)));
}

export type AssessmentAiResult = {
  clamped: ClampedAssessmentDecision;
  source: AiProviderSource | "local";
};

export type AssessmentAiInput = {
  applicant: string;
  phone: string;
  mpesaNumber?: string;
  county: string;
  employer: string;
  employmentStatus?: string;
  jobTitle?: string;
  yearsAtEmployer?: number;
  monthlyIncome: number;
  monthlyExpenses?: number;
  existingLoans?: number;
  rentMortgage?: number;
  amount: number;
  months: number;
  purpose: string;
  baselineEligibilityScore: number;
  minLoanAmount: number;
  maxLoanAmount: number;
  minProcessingFee: number;
  monthlyInterestRate: number;
  automatedApprovals: boolean;
  quoteMonthly?: number;
};

function buildAssessmentPrompt(input: AssessmentAiInput): string {
  const stepCatalog = ASSESSMENT_STEP_IDS.map((id) => `"${id}"`).join(", ");
  const profile = {
    monthlyIncome: input.monthlyIncome,
    monthlyExpenses: input.monthlyExpenses,
    existingLoans: input.existingLoans,
    rentMortgage: input.rentMortgage,
  };
  const disposable = computeDisposableIncome(profile);
  const maxMonthlyPayment = computeMaxAffordableMonthlyPayment(profile);
  const affordabilityCeiling = computeAffordabilityCeiling({
    profile,
    minLoanAmount: input.minLoanAmount,
    maxLoanAmount: input.maxLoanAmount,
    months: input.months,
    monthlyInterestRatePercent: input.monthlyInterestRate,
    minProcessingFee: input.minProcessingFee,
  });

  return `You are HarakaCash credit analyst for Kenya consumer loans. Return ONLY valid JSON:
{
  "steps": [
    { "id": string, "status": "passed" | "failed" | "review", "note": string (optional, short) }
  ],
  "overallScore": number (0-100),
  "eligible": boolean,
  "decisionHint": "approve" | "decline" | "manual_review",
  "approvedAmount": number (integer KES; required when decisionHint is "approve"),
  "notes": string (optional, one short sentence for internal use)
}

Required step ids (include every id exactly once):
[${stepCatalog}]

Platform policy (hard constraints — do not override):
- minLoanAmount: ${input.minLoanAmount}
- maxLoanAmount: ${input.maxLoanAmount}
- minProcessingFee: ${input.minProcessingFee}
- monthlyInterestRatePercent: ${input.monthlyInterestRate}
- automatedApprovals: ${input.automatedApprovals}

Application:
- applicant: ${input.applicant || "unknown"}
- phone: ${input.phone || "unknown"}
- mpesaNumber: ${input.mpesaNumber || "unknown"}
- county: ${input.county || "unknown"}
- employmentStatus: ${input.employmentStatus ?? "unknown"}
- employer: ${input.employer || "unknown"}
- jobTitle: ${input.jobTitle ?? "unknown"}
- yearsAtEmployer: ${input.yearsAtEmployer ?? "unknown"}
- monthlyIncome: ${input.monthlyIncome}
- monthlyExpenses: ${input.monthlyExpenses ?? "unknown"}
- rentMortgage: ${input.rentMortgage ?? "unknown"}
- existingLoans: ${input.existingLoans ?? "unknown"}
- disposableIncome: ${disposable} (income − expenses − rent − 5% of existing loans)
- maxAffordableMonthlyPayment: ${Number.isFinite(maxMonthlyPayment) ? maxMonthlyPayment : "unknown"} (${AFFORDABLE_PAYMENT_SHARE_OF_DISPOSABLE * 100}% of disposable)
- affordabilityCeilingPrincipal: ${affordabilityCeiling} (max principal before hard policy clamp; never exceed loanAmount)
- loanAmount: ${input.amount}
- termMonths: ${input.months}
- purpose: ${input.purpose || "unknown"}
- estimatedMonthlyPayment: ${input.quoteMonthly ?? "unknown"}
- baselineEligibilityScore: ${input.baselineEligibilityScore}

Step guidance:
- identity: name + phone present and plausible Kenyan mobile
- applicationReview: required fields complete
- employment: employer / employment status credibility
- income: income vs loan size and monthly payment
- existingLoans: debt load from existingLoans + expenses
- repayment: residual income after expenses and proposed payment
- credit: overall creditworthiness from available facts (no CRB yet)
- risk: fraud / inconsistency / over-leverage flags
- rules: amount within policy band; term reasonable
- score: reflect overallScore
- eligibility: align with eligible + decisionHint

Rules:
1. Be conservative. Prefer "review" or "decline" when data is thin or income looks tight.
2. If amount is outside min/max loan band, decisionHint must be "decline" and eligible false.
3. If automatedApprovals is false, decisionHint must be "manual_review" or "decline", never "approve".
4. decisionHint must be exactly "approve", "decline", or "manual_review" — never "review".
5. When approving, set approvedAmount to an integer KES offer ≤ loanAmount and ≥ minLoanAmount. Prefer the full request when affordable; otherwise offer a lower amount the applicant can service (partial approval is allowed). Never exceed affordabilityCeilingPrincipal. Use 0 only when declining.
6. When declining, set approvedAmount to 0 (or omit it).
7. notes: plain sentence, no marketing, never say "simulation".
8. JSON only.`;
}

function toRawAssessment(payload: AiAssessmentPayload): RawAiAssessment {
  return {
    steps: normalizeAssessmentSteps(payload.steps),
    overallScore: payload.overallScore,
    eligible: payload.eligible,
    decisionHint: payload.decisionHint as AssessmentDecisionHint,
    approvedAmount: payload.approvedAmount,
    notes: payload.notes,
  };
}

async function requestGeminiAssessment(
  input: AssessmentAiInput,
): Promise<AiAssessmentPayload | null> {
  const text = await generateJsonWithGemini({
    prompt: buildAssessmentPrompt(input),
    temperature: 0.15,
  });
  if (!text) return null;
  return parseAiAssessmentPayload(text);
}

async function requestOpenAiAssessment(
  input: AssessmentAiInput,
): Promise<AiAssessmentPayload | null> {
  const text = await generateJsonWithOpenAi({
    system:
      "You return only valid JSON for HarakaCash loan assessment. Be conservative. Never invent CRB data.",
    prompt: buildAssessmentPrompt(input),
    temperature: 0.15,
  });
  if (!text) return null;
  return parseAiAssessmentPayload(text);
}

async function requestNvidiaAssessment(
  input: AssessmentAiInput,
): Promise<AiAssessmentPayload | null> {
  const text = await generateJsonWithNvidia({
    system:
      'You return only valid JSON for HarakaCash loan assessment. Be conservative. Never invent CRB data. decisionHint must be exactly one of: "approve", "decline", "manual_review" (never "review").',
    prompt: buildAssessmentPrompt(input),
    temperature: 0.15,
    timeoutMs: 25_000,
    maxTokens: 2048,
  });
  if (!text) return null;
  return parseAiAssessmentPayload(text);
}

async function requestAssessmentForSource(
  source: AiProviderSource,
  input: AssessmentAiInput,
): Promise<AiAssessmentPayload | null> {
  switch (source) {
    case "gemini":
      return requestGeminiAssessment(input);
    case "openai":
      return requestOpenAiAssessment(input);
    case "nvidia":
      return requestNvidiaAssessment(input);
  }
}

export async function requestAiAssessment(
  input: AssessmentAiInput,
  provider: QuoteAiProvider = "auto",
): Promise<{ raw: RawAiAssessment; source: AiProviderSource } | null> {
  for (const source of aiProviderOrder(provider)) {
    try {
      const payload = await requestAssessmentForSource(source, input);
      if (!payload) continue;
      const ids = new Set(payload.steps.map((step) => step.id));
      const missing = ASSESSMENT_STEP_IDS.filter((id) => !ids.has(id));
      if (missing.length > ASSESSMENT_STEP_IDS.length / 2) continue;
      return { raw: toRawAssessment(payload), source };
    } catch {
      // try next provider
    }
  }
  return null;
}

/** Full assessment with hard policy clamps. Falls back to deterministic local rules. */
export async function runAiAssessmentWithPolicy(
  input: AssessmentAiInput,
  provider: QuoteAiProvider = "auto",
): Promise<AssessmentAiResult> {
  const ai = await requestAiAssessment(input, provider);
  const clamped = clampAssessmentDecision({
    amount: input.amount,
    minLoanAmount: input.minLoanAmount,
    maxLoanAmount: input.maxLoanAmount,
    automatedApprovals: input.automatedApprovals,
    baselineEligibilityScore: input.baselineEligibilityScore,
    monthlyIncome: input.monthlyIncome,
    monthlyExpenses: input.monthlyExpenses,
    existingLoans: input.existingLoans,
    rentMortgage: input.rentMortgage,
    months: input.months,
    monthlyInterestRatePercent: input.monthlyInterestRate,
    minProcessingFee: input.minProcessingFee,
    ai: ai?.raw ?? null,
  });

  return {
    clamped,
    source: ai?.source ?? "local",
  };
}

/** @internal exported for tests */
export function ensureStepIdsComplete(
  steps: Array<{ id: string }>,
): AssessmentStepId[] {
  return ASSESSMENT_STEP_IDS.filter((id) => !steps.some((step) => step.id === id));
}
