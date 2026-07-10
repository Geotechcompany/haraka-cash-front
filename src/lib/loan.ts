export const KES = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

export const kes = (n: number) => KES.format(n);

export const num = (n: number) => new Intl.NumberFormat("en-KE").format(n);

/**
 * HarakaCash processing fee schedule (indicative).
 * Tiered flat fees per bracket.
 */
export function processingFee(amount: number): number {
  if (amount <= 5000) return 150;
  if (amount <= 10000) return 250;
  if (amount <= 20000) return 500;
  if (amount <= 50000) return 1000;
  if (amount <= 100000) return 2000;
  return Math.round(amount * 0.022);
}

/** Simple monthly interest rate (indicative demo only). */
export const MONTHLY_INTEREST = 0.06;

export function loanQuote(amount: number, months: number) {
  const fee = processingFee(amount);
  const interest = Math.round(amount * MONTHLY_INTEREST * months);
  const totalPayable = amount + interest + fee;
  const monthly = Math.round(totalPayable / months);
  return { amount, months, fee, interest, totalPayable, monthly };
}
