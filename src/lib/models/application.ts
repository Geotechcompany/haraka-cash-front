export type ApplicationStatus =
  | "Pending"
  | "Approved"
  | "Declined"
  | "Completed"
  | "Disbursing";

export type ApplicationRecord = {
  _id?: string;
  applicationNumber: string;
  clerkUserId?: string;
  applicant: string;
  phone: string;
  county: string;
  employer: string;
  monthlyIncome: number;
  amount: number;
  months: number;
  purpose: string;
  eligibilityScore: number;
  riskScore: number;
  status: ApplicationStatus;
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
  county: string;
  employer: string;
  monthlyIncome: number;
  amount: number;
  months: number;
  purpose: string;
  eligibilityScore: number;
  riskScore: number;
  status: ApplicationStatus;
  createdAt: string;
};

export function toApplication(doc: ApplicationRecord): Application {
  return {
    id: doc.applicationNumber,
    applicant: doc.applicant,
    phone: doc.phone,
    county: doc.county,
    employer: doc.employer,
    monthlyIncome: doc.monthlyIncome,
    amount: doc.amount,
    months: doc.months,
    purpose: doc.purpose,
    eligibilityScore: doc.eligibilityScore,
    riskScore: doc.riskScore,
    status: doc.status,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt),
  };
}

export function nextApplicationNumber(existingCount: number) {
  return `HC-${(10234 + existingCount).toString()}`;
}
