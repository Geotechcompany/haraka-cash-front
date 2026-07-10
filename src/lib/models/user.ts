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
