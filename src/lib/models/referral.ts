export type ReferralStatus = "awarded" | "skipped";

export type ReferralRecord = {
  _id?: string;
  referrerClerkId: string;
  refereeClerkId: string;
  code: string;
  creditAwarded: number;
  status: ReferralStatus;
  /** Why credit was skipped (self-referral, cap, invalid, duplicate). */
  skipReason?: string;
  createdAt: Date;
};

export type ReferralSummary = {
  id: string;
  referrerClerkId: string;
  refereeClerkId: string;
  code: string;
  creditAwarded: number;
  status: ReferralStatus;
  createdAt: string;
};

export function toReferralSummary(doc: ReferralRecord, index = 0): ReferralSummary {
  return {
    id: doc._id != null ? String(doc._id) : String(index),
    referrerClerkId: doc.referrerClerkId,
    refereeClerkId: doc.refereeClerkId,
    code: doc.code,
    creditAwarded: doc.creditAwarded,
    status: doc.status,
    createdAt:
      doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
  };
}
