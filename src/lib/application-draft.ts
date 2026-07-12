import type { ApplicationDraftFields, ApplicationDraftPayload } from "@/lib/models/application-draft";

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
  "idDocumentName",
] as const satisfies ReadonlyArray<keyof ApplicationDraftFields>;

/** True when the wizard has real progress worth persisting (not empty first paint). */
export function isDraftWorthSaving({
  step,
  amount,
  months,
  form,
  defaultAmount,
  defaultMonths = 3,
}: {
  step: number;
  amount: number;
  months: number;
  form: ApplicationDraftFields;
  defaultAmount: number;
  defaultMonths?: number;
}): boolean {
  if (step > 0) return true;
  if (amount !== defaultAmount || months !== defaultMonths) return true;
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
    months: Math.min(Math.max(Math.floor(payload.months) || 1, 1), 12),
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
      idDocumentName: payload.form.idDocumentName ?? "",
    },
  };
}
