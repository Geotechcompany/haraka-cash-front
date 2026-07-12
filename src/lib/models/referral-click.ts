export type ReferralClickSource = "register" | "shortlink";

export type ReferralClickRecord = {
  _id?: string;
  code: string;
  referrerClerkId: string;
  ipHash: string;
  country?: string;
  city?: string;
  region?: string;
  source: ReferralClickSource;
  converted: boolean;
  convertedAt?: Date;
  refereeClerkId?: string;
  userAgent?: string;
  createdAt: Date;
};

export type ReferralClickSummary = {
  id: string;
  location: string;
  source: ReferralClickSource;
  converted: boolean;
  createdAt: string;
};

export function formatReferralClickLocation(doc: Pick<ReferralClickRecord, "city" | "region" | "country">): string {
  const parts = [doc.city, doc.region, doc.country].filter(
    (part): part is string => typeof part === "string" && part.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(", ") : "Unknown location";
}

export function toReferralClickSummary(doc: ReferralClickRecord, index = 0): ReferralClickSummary {
  return {
    id: doc._id != null ? String(doc._id) : String(index),
    location: formatReferralClickLocation(doc),
    source: doc.source,
    converted: doc.converted,
    createdAt:
      doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
  };
}
