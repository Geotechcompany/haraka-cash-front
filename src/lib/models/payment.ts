export type PaymentKind =
  | "processing_fee"
  | "deposit"
  | "withdrawal"
  | "disbursement"
  | "repayment";
export type PaymentStatus = "pending" | "processing" | "success" | "failed";

export type PaymentRecord = {
  _id?: string;
  reference: string;
  kind: PaymentKind;
  amount: number;
  phone: string;
  status: PaymentStatus;
  provider: "smply_pay";
  providerRef?: string;
  clerkUserId?: string;
  applicationNumber?: string;
  description?: string;
  providerResponse?: unknown;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Payment = {
  id: string;
  reference: string;
  kind: PaymentKind;
  amount: number;
  phone: string;
  status: PaymentStatus;
  applicant?: string;
  applicationNumber?: string;
  description?: string;
  createdAt: string;
};

export function toPayment(doc: PaymentRecord, applicant?: string): Payment {
  return {
    id: doc.reference,
    reference: doc.reference,
    kind: doc.kind,
    amount: doc.amount,
    phone: doc.phone,
    status: doc.status,
    applicant,
    applicationNumber: doc.applicationNumber,
    description: doc.description,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
  };
}

export function paymentReference(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
