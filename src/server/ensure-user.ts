import { clerkClient } from "@clerk/tanstack-react-start/server";

import type { UserRecord } from "@/lib/models/user";

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

/** Create or load the Mongo user row for a Clerk account (idempotent). */
export async function ensureUser(clerkId: string): Promise<UserRecord> {
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const existing = await db.collection<UserRecord>("users").findOne({ clerkId });
  if (existing) {
    const { ensureReferralCode } = await import("@/server/referrals");
    return ensureReferralCode(existing);
  }

  const clerk = await clerkClient();
  const profile = await clerk.users.getUser(clerkId).catch(() => null);
  const now = new Date();
  const { allocateReferralCodeForNewUser } = await import("@/server/referrals");
  const referralCode = await allocateReferralCodeForNewUser();
  const doc: UserRecord = {
    clerkId,
    email: profile?.emailAddresses[0]?.emailAddress,
    firstName: profile?.firstName ?? undefined,
    lastName: profile?.lastName ?? undefined,
    phone: profile?.phoneNumbers[0]?.phoneNumber,
    eligibilityScore: 0,
    availableCredit: 0,
    referralCode,
    referralCreditsEarned: 0,
    referralCount: 0,
    profileComplete: 0,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.collection<UserRecord>("users").insertOne(doc);
    return doc;
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const raced = await db.collection<UserRecord>("users").findOne({ clerkId });
    if (!raced) throw error;
    const { ensureReferralCode } = await import("@/server/referrals");
    return ensureReferralCode(raced);
  }
}
