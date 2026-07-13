export type UserStatus = "Active" | "Suspended";

export type UserRecord = {
  _id?: string;
  clerkId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  nationalId?: string;
  dateOfBirth?: string;
  county?: string;
  employer?: string;
  jobTitle?: string;
  monthlyIncome?: number;
  yearsEmployed?: number;
  bankName?: string;
  accountNumber?: string;
  mpesaNumber?: string;
  eligibilityScore: number;
  availableCredit: number;
  /** Unique invite code this user shares (`?ref=`). */
  referralCode?: string;
  /** Clerk ID of the user who referred this account. */
  referredByClerkId?: string;
  /** Referral code used at signup (audit). */
  referredByCode?: string;
  /** Lifetime credit earned from successful referrals (KES). */
  referralCreditsEarned?: number;
  /** Successful referrals that awarded credit. */
  referralCount?: number;
  profileComplete: number;
  status?: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type UserProfile = {
  name: string;
  email?: string;
  phone?: string;
  nationalId?: string;
  dateOfBirth?: string;
  county?: string;
  employer?: string;
  jobTitle?: string;
  monthlyIncome?: number;
  yearsEmployed?: number;
  bankName?: string;
  accountNumber?: string;
  mpesaNumber?: string;
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

/** Fields that contribute to profile completeness (equal weight). */
export const PROFILE_COMPLETENESS_FIELDS = [
  "name",
  "nationalId",
  "phone",
  "email",
  "dateOfBirth",
  "county",
  "employer",
  "jobTitle",
  "monthlyIncome",
  "yearsEmployed",
  "bankName",
  "accountNumber",
  "mpesaNumber",
] as const;

export type ProfileCompletenessSource = {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  nationalId?: string | null;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  county?: string | null;
  employer?: string | null;
  jobTitle?: string | null;
  monthlyIncome?: number | null;
  yearsEmployed?: number | null;
  bankName?: string | null;
  accountNumber?: string | null;
  mpesaNumber?: string | null;
};

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function hasPositiveNumber(value: number | null | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function hasNonNegativeNumber(value: number | null | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function displayNameFromParts(
  firstName?: string | null,
  lastName?: string | null,
): string {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || "HarakaCash user";
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

export function computeProfileComplete(source: ProfileCompletenessSource): number {
  const name =
    source.name?.trim() ||
    [source.firstName, source.lastName].filter(Boolean).join(" ").trim();

  const filled = [
    hasText(name),
    hasText(source.nationalId),
    hasText(source.phone),
    hasText(source.email),
    hasText(source.dateOfBirth),
    hasText(source.county),
    hasText(source.employer),
    hasText(source.jobTitle),
    hasPositiveNumber(source.monthlyIncome),
    hasNonNegativeNumber(source.yearsEmployed),
    hasText(source.bankName),
    hasText(source.accountNumber),
    hasText(source.mpesaNumber),
  ].filter(Boolean).length;

  return Math.round((filled / PROFILE_COMPLETENESS_FIELDS.length) * 100);
}

export function toUserProfile(doc: UserRecord): UserProfile {
  const name = displayNameFromParts(doc.firstName, doc.lastName);
  return {
    name,
    email: doc.email,
    phone: doc.phone,
    nationalId: doc.nationalId,
    dateOfBirth: doc.dateOfBirth,
    county: doc.county,
    employer: doc.employer,
    jobTitle: doc.jobTitle,
    monthlyIncome: doc.monthlyIncome,
    yearsEmployed: doc.yearsEmployed,
    bankName: doc.bankName,
    accountNumber: doc.accountNumber,
    mpesaNumber: doc.mpesaNumber,
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
  const name = displayNameFromParts(doc.firstName, doc.lastName);

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
