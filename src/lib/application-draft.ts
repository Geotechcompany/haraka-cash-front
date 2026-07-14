import type { ApplicationDraftFields, ApplicationDraftPayload } from "@/lib/models/application-draft";
import {
  clampRepaymentMonths,
  DEFAULT_PRODUCT_TYPE,
  DEFAULT_REPAYMENT_MONTHS,
  type ProductType,
} from "@/lib/lending-products";

const MEANINGFUL_TEXT_KEYS = [
  "nationalId",
  "employer",
  "jobTitle",
  "yearsAtEmployer",
  "monthlyIncome",
  "monthlyExpenses",
  "existingLoans",
  "rentMortgage",
  "additionalDetails",
] as const satisfies ReadonlyArray<keyof ApplicationDraftFields>;

/** True when the wizard has real progress worth persisting (not empty first paint). */
export function isDraftWorthSaving({
  step,
  amount,
  months,
  productType,
  form,
  defaultAmount,
  defaultMonths = DEFAULT_REPAYMENT_MONTHS,
  defaultProductType = DEFAULT_PRODUCT_TYPE,
}: {
  step: number;
  amount: number;
  months: number;
  productType?: ProductType;
  form: ApplicationDraftFields;
  defaultAmount: number;
  defaultMonths?: number;
  defaultProductType?: ProductType;
}): boolean {
  if (step > 0) return true;
  if (amount !== defaultAmount || months !== defaultMonths) return true;
  if (productType && productType !== defaultProductType) return true;
  return MEANINGFUL_TEXT_KEYS.some((key) => form[key].trim() !== "");
}

export function clampDraftStep(step: number, maxStep: number): number {
  if (!Number.isFinite(step) || step < 0) return 0;
  return Math.min(Math.floor(step), maxStep);
}

export function normalizeDraftPayload(
  payload: ApplicationDraftPayload,
  options: { maxStep: number; minAmount: number; maxAmount: number },
): ApplicationDraftPayload {
  return {
    step: clampDraftStep(payload.step, options.maxStep),
    amount: Math.min(Math.max(payload.amount, options.minAmount), options.maxAmount),
    months: clampRepaymentMonths(payload.months),
    productType: payload.productType === "salary_advance" ? "salary_advance" : "personal_loan",
    form: {
      fullName: payload.form.fullName ?? "",
      nationalId: payload.form.nationalId ?? "",
      phone: payload.form.phone ?? "",
      mpesaNumber: payload.form.mpesaNumber ?? "",
      employmentStatus: payload.form.employmentStatus || "Employed",
      employer: payload.form.employer ?? "",
      jobTitle: payload.form.jobTitle ?? "",
      yearsAtEmployer: payload.form.yearsAtEmployer ?? "",
      monthlyIncome: payload.form.monthlyIncome ?? "",
      monthlyExpenses: payload.form.monthlyExpenses ?? "",
      existingLoans: payload.form.existingLoans ?? "",
      rentMortgage: payload.form.rentMortgage ?? "",
      purpose: payload.form.purpose || "Business",
      additionalDetails: payload.form.additionalDetails ?? "",
    },
  };
}
