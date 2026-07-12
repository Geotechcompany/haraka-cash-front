/**
 * Server-only AI assessment of loan applications.
 * Uses the same admin Gemini/OpenAI key resolution and provider order as quote notes.
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
  clampAssessmentDecision,
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
  notes: z.string().max(280).optional(),
});

export type AiAssessmentPayload = z.infer<typeof aiAssessmentSchema>;

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
  return `You are HarakaCash credit analyst for Kenya consumer loans. Return ONLY valid JSON:
{
  "steps": [
    { "id": string, "status": "passed" | "failed" | "review", "note": string (optional, short) }
  ],
  "overallScore": number (0-100),
  "eligible": boolean,
  "decisionHint": "approve" | "decline" | "manual_review",
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
- existingLoans: ${input.existingLoans ?? "unknown"}
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
4. notes: plain sentence, no marketing, never say "simulation".
5. JSON only.`;
}

function toRawAssessment(payload: AiAssessmentPayload): RawAiAssessment {
  return {
    steps: normalizeAssessmentSteps(payload.steps),
    overallScore: payload.overallScore,
    eligible: payload.eligible,
    decisionHint: payload.decisionHint as AssessmentDecisionHint,
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
  return aiAssessmentSchema.parse(extractJsonObject(text));
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
  return aiAssessmentSchema.parse(extractJsonObject(text));
}

export async function requestAiAssessment(
  input: AssessmentAiInput,
  provider: QuoteAiProvider = "auto",
): Promise<{ raw: RawAiAssessment; source: AiProviderSource } | null> {
  for (const source of aiProviderOrder(provider)) {
    try {
      const payload =
        source === "gemini"
          ? await requestGeminiAssessment(input)
          : await requestOpenAiAssessment(input);
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
