import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { buildLoanQuote } from "@/lib/loan";

const generateLoanQuoteInput = z.object({
  amount: z.number().positive(),
  months: z.number().int().min(1).max(36),
  monthlyIncome: z.number().nonnegative().optional(),
  monthlyExpenses: z.number().nonnegative().optional(),
  existingLoans: z.number().nonnegative().optional(),
  employmentStatus: z.string().max(80).optional(),
  purpose: z.string().max(80).optional(),
});

export type GeneratedLoanQuote = {
  amount: number;
  months: number;
  fee: number;
  interest: number;
  totalPayable: number;
  monthly: number;
  notes?: string;
  riskBand?: "low" | "moderate" | "elevated" | "high";
  source: "gemini" | "openai" | "nvidia" | "local";
};

function moneyMatchesBaseline(
  baseline: ReturnType<typeof buildLoanQuote>,
  ai: {
    principal: number;
    termMonths: number;
    interestTotal: number;
    processingFee: number;
    monthlyPayment: number;
    totalPayable: number;
  },
) {
  return (
    ai.principal === baseline.amount &&
    ai.termMonths === baseline.months &&
    ai.interestTotal === baseline.interest &&
    ai.processingFee === baseline.fee &&
    ai.monthlyPayment === baseline.monthly &&
    ai.totalPayable === baseline.totalPayable
  );
}

/**
 * Builds a loan quote. Money math always comes from buildLoanQuote / processingFee
 * (with admin minProcessingFee floor). Gemini, OpenAI, or NVIDIA may add notes + riskBand.
 * Falls back to local calc if no provider key works or the response is invalid.
 */
export const generateLoanQuote = createServerFn({ method: "POST" })
  .validator((input: unknown) => generateLoanQuoteInput.parse(input))
  .handler(async ({ data }): Promise<GeneratedLoanQuote> => {
    const { readPlatformSettings } = await import("@/server/settings");
    const policy = await readPlatformSettings();

    const amount = Math.min(
      Math.max(Math.round(data.amount), policy.minLoanAmount),
      policy.maxLoanAmount,
    );
    const months = Math.min(Math.max(data.months, 1), 12);
    const baseline = buildLoanQuote(amount, months, {
      monthlyInterestRatePercent: policy.monthlyInterestRate,
      minProcessingFee: policy.minProcessingFee,
    });

    const local: GeneratedLoanQuote = {
      ...baseline,
      source: "local",
    };

    try {
      const { requestLoanQuoteAiNotes } = await import("@/server/quote-ai.server");
      const ai = await requestLoanQuoteAiNotes(
        {
          amount,
          months,
          monthlyIncome: data.monthlyIncome,
          monthlyExpenses: data.monthlyExpenses,
          existingLoans: data.existingLoans,
          employmentStatus: data.employmentStatus,
          purpose: data.purpose,
          minLoanAmount: policy.minLoanAmount,
          maxLoanAmount: policy.maxLoanAmount,
          minProcessingFee: policy.minProcessingFee,
          monthlyInterestRate: policy.monthlyInterestRate,
          baseline,
        },
        policy.quoteAiProvider,
      );

      if (!ai) return local;

      const { payload, source } = ai;

      if (!moneyMatchesBaseline(baseline, payload)) {
        return {
          ...baseline,
          notes: payload.notes?.trim() || undefined,
          riskBand: payload.riskBand,
          source: "local",
        };
      }

      return {
        ...baseline,
        notes: payload.notes?.trim() || undefined,
        riskBand: payload.riskBand,
        source,
      };
    } catch {
      return local;
    }
  });
