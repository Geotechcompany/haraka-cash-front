/**
 * Server-only AI clients for loan quote notes / eligibility hints.
 *
 * Key resolution (see settings.ts):
 * - Gemini: admin DB → GEMINI_API_KEY → GOOGLE_GENERATIVE_AI_API_KEY
 * - OpenAI: admin DB → OPENAI_API_KEY
 *
 * Provider selection (`quoteAiProvider`):
 * - auto (default): Gemini if key, else OpenAI if key, else none
 * - gemini / openai: try that provider first; if its key is missing, try the other
 * - off: skip AI (deterministic money math only)
 *
 * Never import this module from client routes — use createServerFn wrappers only.
 */
import "@/lib/server-only";

import { z } from "zod";

import type { QuoteAiProvider } from "@/lib/models/settings";
import type { LoanQuoteBreakdown } from "@/lib/loan";

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

export type QuoteAiSource = "gemini" | "openai";

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

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain JSON");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export async function requestGeminiLoanQuote(
  input: QuoteAiInput,
): Promise<QuoteAiNotesPayload | null> {
  const { resolveGeminiApiKey } = await import("@/server/settings");
  const apiKey = await resolveGeminiApiKey();
  if (!apiKey) return null;

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(buildQuotePrompt(input));
  const text = result.response.text();
  const parsed = extractJsonObject(text);
  return quoteAiNotesSchema.parse(parsed);
}

export async function requestOpenAiLoanQuote(
  input: QuoteAiInput,
): Promise<QuoteAiNotesPayload | null> {
  const { resolveOpenAiApiKey } = await import("@/server/settings");
  const apiKey = await resolveOpenAiApiKey();
  if (!apiKey) return null;

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You return only valid JSON for HarakaCash loan quote notes. Never invent money figures that differ from the baseline.",
      },
      { role: "user", content: buildQuotePrompt(input) },
    ],
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) return null;

  const parsed = extractJsonObject(text);
  return quoteAiNotesSchema.parse(parsed);
}

/**
 * Provider attempt order from admin `quoteAiProvider`.
 * Prefer Gemini in auto mode; always fall back to the other provider when a key exists.
 */
export function quoteAiProviderOrder(provider: QuoteAiProvider): QuoteAiSource[] {
  switch (provider) {
    case "off":
      return [];
    case "openai":
      return ["openai", "gemini"];
    case "gemini":
      return ["gemini", "openai"];
    case "auto":
    default:
      return ["gemini", "openai"];
  }
}

export async function requestLoanQuoteAiNotes(
  input: QuoteAiInput,
  provider: QuoteAiProvider = "auto",
): Promise<QuoteAiResult | null> {
  for (const source of quoteAiProviderOrder(provider)) {
    try {
      const payload =
        source === "gemini"
          ? await requestGeminiLoanQuote(input)
          : await requestOpenAiLoanQuote(input);
      if (payload) return { payload, source };
    } catch {
      // try next provider
    }
  }
  return null;
}
