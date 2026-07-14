import type { ProductType } from "@/lib/lending-products";

export type ApplicationStatus =
  | "Pending"
  | "Approved"
  | "Declined"
  | "Completed"
  | "Disbursing"
  | "DocumentsRequired"
  | "UnderReview"
  | "AdditionalActionRequired";

/** Statuses that prevent starting another application until finalized. */
export const APPLICATION_STATUSES_BLOCKING_NEW_APPLY: ApplicationStatus[] = [
  "Pending",
  "DocumentsRequired",
  "Approved",
  "AdditionalActionRequired",
  "UnderReview",
  "Disbursing",
];

export function applicationBlocksNewApply(status: ApplicationStatus | string): boolean {
  return (APPLICATION_STATUSES_BLOCKING_NEW_APPLY as string[]).includes(status);
}

/** User-facing label for application status badges. */
export function applicationStatusLabel(status: ApplicationStatus | string): string {
  if (status === "UnderReview") return "Under review";
  if (status === "DocumentsRequired") return "Documents required";
  if (status === "AdditionalActionRequired") return "Action required";
  return status;
}

/** Offer is ready but processing fee must be paid before CRB review / disbursement. */
export function statusAwaitsProcessingFee(status: ApplicationStatus | string): boolean {
  return status === "AdditionalActionRequired" || status === "Approved";
}

export type ApplicationRecord = {
  _id?: string;
  applicationNumber: string;
  clerkUserId?: string;
  applicant: string;
  /** Kenyan national ID from the apply form (7–8 digits). */
  nationalId?: string;
  /** Contact phone from the apply form. */
  phone: string;
  /** M-Pesa MSISDN for STK / disbursement (apply-form “M-Pesa number”). */
  mpesaNumber?: string;
  county: string;
  employer: string;
  employmentStatus?: string;
  jobTitle?: string;
  yearsAtEmployer?: number;
  monthlyIncome: number;
  monthlyExpenses?: number;
  existingLoans?: number;
  rentMortgage?: number;
  /** Requested principal (KES). */
  amount: number;
  /** Offered / approved principal after assessment (KES). ≤ amount when set. */
  approvedAmount?: number;
  months: number;
  productType?: ProductType;
  purpose: string;
  eligibilityScore: number;
  riskScore: number;
  status: ApplicationStatus;
  requiredDocuments?: string[];
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  /** Internal assessment notes from AI / policy engine — not shown on public Application DTO. */
  assessmentNotes?: string;
  assessmentSource?: "gemini" | "openai" | "nvidia" | "local";
  quote?: {
    amount: number;
    months: number;
    fee: number;
    interest: number;
    totalPayable: number;
    monthly: number;
  };
  createdAt: Date;
  updatedAt: Date;
};

export type Application = {
  id: string;
  applicant: string;
  phone: string;
  mpesaNumber: string;
  county: string;
  employer: string;
  monthlyIncome: number;
  /** Requested principal (KES). */
  amount: number;
  /** Offered principal after assessment (KES). Present when approved (may equal amount). */
  approvedAmount?: number;
  months: number;
  productType?: ProductType;
  purpose: string;
  eligibilityScore: number;
  riskScore: number;
  status: ApplicationStatus;
  /** True when a successful processing-fee payment exists for this application. */
  feesPaid: boolean;
  /** Processing fee amount from the quote (KES), if available. */
  feeAmount?: number;
  requiredDocuments: string[];
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
};

export function applicationNeedsProcessingFee(
  app: Pick<Application, "status" | "feesPaid">,
): boolean {
  return statusAwaitsProcessingFee(app.status) && !app.feesPaid;
}

/** Borrower has a live loan in disbursement or repayment (not pre-disbursement offer steps). */
export function isActiveDisbursedLoan(status: ApplicationStatus | string): boolean {
  return status === "Disbursing";
}

/** Approved offer still moving through fee payment, CRB review, or pre-disbursement. */
export function isPendingOfferPipeline(status: ApplicationStatus | string): boolean {
  return (
    status === "Approved" ||
    status === "AdditionalActionRequired" ||
    status === "UnderReview"
  );
}

export function findBlockingApplication(applications: Application[]): Application | undefined {
  return applications.find((app) => applicationBlocksNewApply(app.status));
}

export function blockingApplicationDestination(
  app: Pick<Application, "status" | "feesPaid" | "id">,
): { to: "/decision"; search: { applicationId: string } } | { to: "/loans" } {
  if (applicationNeedsProcessingFee(app) || isPendingOfferPipeline(app.status)) {
    return { to: "/decision", search: { applicationId: app.id } };
  }
  return { to: "/loans" };
}

export function pendingOfferHeadline(app: Pick<Application, "status" | "feesPaid">): string {
  if (applicationNeedsProcessingFee(app)) return "Offer pending";
  if (app.status === "UnderReview") return "Under review";
  return "Offer in progress";
}

/** Phone used for loan-related STK (prefer apply-form M-Pesa number). */
export function applicationStkPhone(doc: Pick<ApplicationRecord, "mpesaNumber" | "phone">): string {
  const mpesa = doc.mpesaNumber?.trim();
  if (mpesa) return mpesa;
  const phone = doc.phone?.trim();
  if (phone && !/x/i.test(phone)) return phone;
  return "";
}

export function toApplication(
  doc: ApplicationRecord,
  options?: { feesPaid?: boolean },
): Application {
  const feesPaid =
    options?.feesPaid ??
    (doc.status === "UnderReview" ||
      doc.status === "Disbursing" ||
      doc.status === "Completed");

  return {
    id: doc.applicationNumber,
    applicant: doc.applicant,
    phone: doc.phone,
    mpesaNumber: doc.mpesaNumber?.trim() || doc.phone,
    county: doc.county,
    employer: doc.employer,
    monthlyIncome: doc.monthlyIncome,
    amount: doc.amount,
    approvedAmount: doc.approvedAmount,
    months: doc.months,
    productType: doc.productType ?? "personal_loan",
    purpose: doc.purpose,
    eligibilityScore: doc.eligibilityScore,
    riskScore: doc.riskScore,
    status: doc.status,
    feesPaid,
    feeAmount: doc.quote?.fee,
    requiredDocuments: doc.requiredDocuments ?? [],
    reviewedBy: doc.reviewedBy,
    reviewedAt: doc.reviewedAt
      ? doc.reviewedAt instanceof Date
        ? doc.reviewedAt.toISOString()
        : String(doc.reviewedAt)
      : undefined,
    reviewNotes: doc.reviewNotes,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
  };
}

export function nextApplicationNumber(existingCount: number) {
  return `HC-${(10234 + existingCount).toString()}`;
}
