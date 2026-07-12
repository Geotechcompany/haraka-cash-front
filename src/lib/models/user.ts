export type UserStatus = "Active" | "Suspended";

export type UserRecord = {
  _id?: string;
  clerkId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  county?: string;
  eligibilityScore: number;
  availableCredit: number;
  profileComplete: number;
  status?: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type UserProfile = {
  name: string;
  email?: string;
  phone?: string;
  eligibilityScore: number;
  availableCredit: number;
  profileComplete: number;
};

export type AdminUser = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  county?: string;
  eligibilityScore: number;
  availableCredit: number;
  profileComplete: number;
  status: UserStatus;
  applicationCount: number;
  totalBorrowed: number;
  createdAt: string;
  updatedAt: string;
};

export function toUserProfile(doc: UserRecord): UserProfile {
  const name = [doc.firstName, doc.lastName].filter(Boolean).join(" ") || "HarakaCash user";
  return {
    name,
    email: doc.email,
    phone: doc.phone,
    eligibilityScore: doc.eligibilityScore,
    availableCredit: doc.availableCredit,
    profileComplete: doc.profileComplete,
  };
}

export type AdminUserLoanSummary = {
  applicationCount: number;
  totalBorrowed: number;
};

export function toAdminUser(
  doc: UserRecord,
  loanSummary?: Partial<AdminUserLoanSummary>,
): AdminUser {
  const name = [doc.firstName, doc.lastName].filter(Boolean).join(" ") || "HarakaCash user";

  return {
    id: doc.clerkId,
    name,
    email: doc.email,
    phone: doc.phone,
    county: doc.county,
    eligibilityScore: doc.eligibilityScore,
    availableCredit: doc.availableCredit,
    profileComplete: doc.profileComplete,
    status: doc.status ?? "Active",
    applicationCount: loanSummary?.applicationCount ?? 0,
    totalBorrowed: loanSummary?.totalBorrowed ?? 0,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}
