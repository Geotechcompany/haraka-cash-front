export const MAX_REPAYMENT_MONTHS = 1;
export const DEFAULT_REPAYMENT_MONTHS = 1;

export type ProductType = "personal_loan" | "salary_advance";

export const DEFAULT_PRODUCT_TYPE: ProductType = "personal_loan";

const PRODUCT_TYPE_ALIASES: Record<string, ProductType> = {
  personal_loan: "personal_loan",
  "personal-loan": "personal_loan",
  personal: "personal_loan",
  loan: "personal_loan",
  salary_advance: "salary_advance",
  "salary-advance": "salary_advance",
  salary: "salary_advance",
  advance: "salary_advance",
};

export function parseProductType(value: string | undefined | null): ProductType | null {
  if (!value?.trim()) return null;
  return PRODUCT_TYPE_ALIASES[value.trim().toLowerCase()] ?? null;
}

/** Reads `product` or `type` from apply URL search params. */
export function parseProductTypeFromSearch(search: {
  product?: string;
  type?: string;
}): ProductType | null {
  return parseProductType(search.product) ?? parseProductType(search.type);
}

export function productTypeLabel(type: ProductType | undefined | null): string {
  if (type === "salary_advance") return "Salary advance";
  return "Personal loan";
}

export function clampRepaymentMonths(months: number): number {
  const rounded = Math.max(1, Math.round(months) || 1);
  return Math.min(rounded, MAX_REPAYMENT_MONTHS);
}

export function formatRepaymentMonths(months: number): string {
  const n = clampRepaymentMonths(months);
  return n === 1 ? "1 month" : `${n} months`;
}

export function formatRepaymentPeriod(months: number): string {
  const n = clampRepaymentMonths(months);
  return n === 1 ? "1 month repayment" : `${n} months repayment`;
}

/** Salary advance defaults to a smaller principal when policy allows. */
export function defaultAmountForProduct(
  productType: ProductType,
  policyDefault: number,
  minLoanAmount: number,
): number {
  if (productType !== "salary_advance") return policyDefault;
  const salaryDefault = Math.min(10_000, policyDefault);
  return Math.max(salaryDefault, minLoanAmount);
}
