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
 * HarakaCash processing fee schedule (indicative).
 * Tiered flat fees per bracket, never below `minFee`.
 */
export function processingFee(
  amount: number,
  minFee: number = DEFAULT_MIN_PROCESSING_FEE,
): number {
  const floor = Math.max(0, Math.round(minFee));
  let fee: number;
  if (amount <= 5000) fee = 150;
  else if (amount <= 10000) fee = 250;
  else if (amount <= 20000) fee = 500;
  else if (amount <= 50000) fee = 1000;
  else if (amount <= 100000) fee = 2000;
  else fee = Math.round(amount * 0.022);
  return Math.max(fee, floor);
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
  const fee = processingFee(principal, minFee);
  const interest = Math.round(principal * (rate / 100) * termMonths);
  const totalPayable = principal + interest + fee;
  const monthly = Math.round(totalPayable / termMonths);
  return { amount: principal, months: termMonths, fee, interest, totalPayable, monthly };
}

export function loanQuote(amount: number, months: number) {
  return buildLoanQuote(amount, months, MONTHLY_INTEREST * 100);
}
