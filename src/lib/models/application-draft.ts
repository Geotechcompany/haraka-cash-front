/** In-progress apply wizard payload persisted per signed-in user. */
export type ApplicationDraftFields = {
  fullName: string;
  nationalId: string;
  phone: string;
  mpesaNumber: string;
  employmentStatus: string;
  employer: string;
  jobTitle: string;
  yearsAtEmployer: string;
  monthlyIncome: string;
  monthlyExpenses: string;
  existingLoans: string;
  rentMortgage: string;
  purpose: string;
  additionalDetails: string;
  idDocumentName: string;
};

export type ApplicationDraftPayload = {
  step: number;
  amount: number;
  months: number;
  form: ApplicationDraftFields;
};

export type ApplicationDraftRecord = ApplicationDraftPayload & {
  _id?: string;
  clerkId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ApplicationDraft = ApplicationDraftPayload & {
  updatedAt: string;
};

export function toApplicationDraft(doc: ApplicationDraftRecord): ApplicationDraft {
  return {
    step: doc.step,
    amount: doc.amount,
    months: doc.months,
    form: doc.form,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}
