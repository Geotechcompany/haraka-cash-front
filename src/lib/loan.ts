import { seedUnit } from "@/lib/deterministic-seed";

export const KES = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

export const kes = (n: number) => KES.format(n);

export const num = (n: number) => new Intl.NumberFormat("en-KE").format(n);

/** Default floor when platform settings are unavailable. */
export const DEFAULT_MIN_PROCESSING_FEE = 150;

/**
 * Processing fee from principal percentage + fixed component, with deterministic jitter.
 * Same `seed` always yields the same fee (e.g. application number).
 */
export function processingFee(
  amount: number,
  minFee: number = DEFAULT_MIN_PROCESSING_FEE,
  seed?: string,
): number {
  const floor = Math.max(0, Math.round(minFee));
  const principal = Math.max(0, Math.round(amount));
  if (principal <= 0) return floor;

  const seedKey = seed ?? `fee:principal:${principal}`;
  const ratePct = 1.2 + seedUnit(seedKey, 0) * 0.6;
  const fixed = 25 + Math.floor(seedUnit(seedKey, 1) * 35);
  let fee = Math.round(principal * (ratePct / 100) + fixed);

  const jitter = 7 + Math.floor(seedUnit(seedKey, 2) * 86);
  fee += (seedUnit(seedKey, 3) > 0.5 ? 1 : -1) * jitter;

  if (fee % 100 === 0) fee += 17 + Math.floor(seedUnit(seedKey, 4) * 30);
  if (fee % 50 === 0 && fee % 100 !== 0) fee += 13 + Math.floor(seedUnit(seedKey, 5) * 20);

  const minWithJitter = floor + 10 + Math.floor(seedUnit(seedKey, 6) * 40);
  return Math.max(fee, minWithJitter);
}

/** Simple monthly interest rate as a decimal (indicative fallback). */
export const MONTHLY_INTEREST = 0.06;

export type LoanQuoteBreakdown = {
  amount: number;
  months: number;
  fee: number;
  interest: number;
  totalPayable: number;
  monthly: number;
};

export type BuildLoanQuoteOptions = {
  monthlyInterestRatePercent?: number;
  minProcessingFee?: number;
  /** Stable key (e.g. application number) for deterministic fee jitter. */
  feeSeed?: string;
};

/**
 * Deterministic quote from principal, term, and platform monthly rate (%).
 * Source of truth for money math — AI output must match or fall back here.
 */
export function buildLoanQuote(
  amount: number,
  months: number,
  monthlyInterestRatePercentOrOptions: number | BuildLoanQuoteOptions = MONTHLY_INTEREST * 100,
  maybeMinFee?: number,
): LoanQuoteBreakdown {
  const options: BuildLoanQuoteOptions =
    typeof monthlyInterestRatePercentOrOptions === "number"
      ? {
          monthlyInterestRatePercent: monthlyInterestRatePercentOrOptions,
          minProcessingFee: maybeMinFee,
        }
      : monthlyInterestRatePercentOrOptions;

  const rate = options.monthlyInterestRatePercent ?? MONTHLY_INTEREST * 100;
  const minFee = options.minProcessingFee ?? DEFAULT_MIN_PROCESSING_FEE;
  const principal = Math.round(amount);
  const termMonths = Math.max(1, Math.round(months));
  const fee = processingFee(principal, minFee, options.feeSeed);
  const interest = Math.round(principal * (rate / 100) * termMonths);
  const totalPayable = principal + interest + fee;
  const monthly = Math.round(totalPayable / termMonths);
  return { amount: principal, months: termMonths, fee, interest, totalPayable, monthly };
}

export function loanQuote(amount: number, months: number) {
  return buildLoanQuote(amount, months, MONTHLY_INTEREST * 100);
}
