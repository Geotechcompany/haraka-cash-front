/**
 * Server-only Gemini client for loan quote notes / eligibility hints.
 *
 * API key resolution (see resolveGeminiApiKey in settings.ts):
 * 1. Admin-saved platform setting
 * 2. GEMINI_API_KEY env
 * 3. GOOGLE_GENERATIVE_AI_API_KEY env
 *
 * Never import this module from client routes — use createServerFn wrappers only.
 */
import "@/lib/server-only";

import { z } from "zod";

import type { LoanQuoteBreakdown } from "@/lib/loan";

export const geminiQuoteSchema = z.object({
  principal: z.number().positive(),
  termMonths: z.number().int().positive(),
  interestTotal: z.number().nonnegative(),
  processingFee: z.number().nonnegative(),
  monthlyPayment: z.number().positive(),
  totalPayable: z.number().positive(),
  notes: z.string().max(280).optional(),
  riskBand: z.enum(["low", "moderate", "elevated", "high"]).optional(),
});

export type GeminiQuotePayload = z.infer<typeof geminiQuoteSchema>;

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

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini response did not contain JSON");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export async function requestGeminiLoanQuote(
  input: QuoteAiInput,
): Promise<GeminiQuotePayload | null> {
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

  const prompt = `You are HarakaCash lending assistant for Kenya. Return ONLY valid JSON matching this schema:
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

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = extractJsonObject(text);
  return geminiQuoteSchema.parse(parsed);
}
