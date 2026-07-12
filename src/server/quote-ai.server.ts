/**
 * Server-only AI clients for loan quote notes / eligibility hints.
 *
 * Key resolution (see settings.ts):
 * - Gemini: admin DB → GEMINI_API_KEY → GOOGLE_GENERATIVE_AI_API_KEY
 * - OpenAI: admin DB → OPENAI_API_KEY
 * - NVIDIA: admin DB → NVIDIA_API_KEY (NIM OpenAI-compatible)
 *
 * Provider selection (`quoteAiProvider`):
 * - auto (default): Gemini → OpenAI → NVIDIA (first key that works)
 * - gemini / openai / nvidia: try that provider first; then the other two
 * - off: skip AI (deterministic money math only)
 *
 * Never import this module from client routes — use createServerFn wrappers only.
 */
import "@/lib/server-only";

import { z } from "zod";

import type { QuoteAiProvider } from "@/lib/models/settings";
import type { LoanQuoteBreakdown } from "@/lib/loan";
import {
  aiProviderOrder,
  extractJsonObject,
  generateJsonWithGemini,
  generateJsonWithNvidia,
  generateJsonWithOpenAi,
  type AiProviderSource,
} from "@/server/ai-provider.server";

export const quoteAiNotesSchema = z.object({
  principal: z.number().positive(),
  termMonths: z.number().int().positive(),
  interestTotal: z.number().nonnegative(),
  processingFee: z.number().nonnegative(),
  monthlyPayment: z.number().positive(),
  totalPayable: z.number().positive(),
  notes: z.string().max(280).optional(),
  riskBand: z.enum(["low", "moderate", "elevated", "high"]).optional(),
});

/** @deprecated Prefer quoteAiNotesSchema — kept for existing imports. */
export const geminiQuoteSchema = quoteAiNotesSchema;

export type QuoteAiNotesPayload = z.infer<typeof quoteAiNotesSchema>;
export type GeminiQuotePayload = QuoteAiNotesPayload;

export type QuoteAiSource = AiProviderSource;

export type QuoteAiResult = {
  payload: QuoteAiNotesPayload;
  source: QuoteAiSource;
};

export type QuoteAiInput = {
  amount: number;
  months: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  existingLoans?: number;
  employmentStatus?: string;
  purpose?: string;
  minLoanAmount: number;
  maxLoanAmount: number;
  minProcessingFee: number;
  monthlyInterestRate: number;
  baseline: LoanQuoteBreakdown;
};

function buildQuotePrompt(input: QuoteAiInput): string {
  return `You are HarakaCash lending assistant for Kenya. Return ONLY valid JSON matching this schema:
{
  "principal": number,
  "termMonths": number,
  "interestTotal": number,
  "processingFee": number,
  "monthlyPayment": number,
  "totalPayable": number,
  "notes": string (optional, one short sentence for the applicant),
  "riskBand": "low" | "moderate" | "elevated" | "high" (optional)
}

Policy bounds:
- minLoanAmount: ${input.minLoanAmount}
- maxLoanAmount: ${input.maxLoanAmount}
- minProcessingFee: ${input.minProcessingFee}
- monthlyInterestRatePercent: ${input.monthlyInterestRate}
- termMonths must equal ${input.months}
- principal must equal ${input.amount}

Deterministic baseline (you MUST copy these money fields exactly):
${JSON.stringify(input.baseline)}

Applicant context (for notes + riskBand only):
- employmentStatus: ${input.employmentStatus ?? "unknown"}
- monthlyIncome: ${input.monthlyIncome ?? "unknown"}
- monthlyExpenses: ${input.monthlyExpenses ?? "unknown"}
- existingLoans: ${input.existingLoans ?? "unknown"}
- purpose: ${input.purpose ?? "unknown"}

Rules:
1. Set principal, termMonths, interestTotal, processingFee, monthlyPayment, totalPayable EXACTLY to the baseline values (map interest→interestTotal, fee→processingFee, monthly→monthlyPayment, amount→principal, months→termMonths).
2. notes: one plain sentence about affordability or term fit. No marketing fluff. No word "simulation".
3. riskBand: estimate from income vs monthly payment and existing loans.
4. JSON only.`;
}

export async function requestGeminiLoanQuote(
  input: QuoteAiInput,
): Promise<QuoteAiNotesPayload | null> {
  const text = await generateJsonWithGemini({
    prompt: buildQuotePrompt(input),
    temperature: 0.2,
  });
  if (!text) return null;
  return quoteAiNotesSchema.parse(extractJsonObject(text));
}

export async function requestOpenAiLoanQuote(
  input: QuoteAiInput,
): Promise<QuoteAiNotesPayload | null> {
  const text = await generateJsonWithOpenAi({
    system:
      "You return only valid JSON for HarakaCash loan quote notes. Never invent money figures that differ from the baseline.",
    prompt: buildQuotePrompt(input),
    temperature: 0.2,
  });
  if (!text) return null;
  return quoteAiNotesSchema.parse(extractJsonObject(text));
}

export async function requestNvidiaLoanQuote(
  input: QuoteAiInput,
): Promise<QuoteAiNotesPayload | null> {
  const text = await generateJsonWithNvidia({
    system:
      "You return only valid JSON for HarakaCash loan quote notes. Never invent money figures that differ from the baseline.",
    prompt: buildQuotePrompt(input),
    temperature: 0.2,
  });
  if (!text) return null;
  return quoteAiNotesSchema.parse(extractJsonObject(text));
}

async function requestQuoteForSource(
  source: AiProviderSource,
  input: QuoteAiInput,
): Promise<QuoteAiNotesPayload | null> {
  switch (source) {
    case "gemini":
      return requestGeminiLoanQuote(input);
    case "openai":
      return requestOpenAiLoanQuote(input);
    case "nvidia":
      return requestNvidiaLoanQuote(input);
  }
}

/** @deprecated Prefer aiProviderOrder from ai-provider.server */
export function quoteAiProviderOrder(provider: QuoteAiProvider): QuoteAiSource[] {
  return aiProviderOrder(provider);
}

export async function requestLoanQuoteAiNotes(
  input: QuoteAiInput,
  provider: QuoteAiProvider = "auto",
): Promise<QuoteAiResult | null> {
  for (const source of aiProviderOrder(provider)) {
    try {
      const payload = await requestQuoteForSource(source, input);
      if (payload) return { payload, source };
    } catch {
      // try next provider
    }
  }
  return null;
}
