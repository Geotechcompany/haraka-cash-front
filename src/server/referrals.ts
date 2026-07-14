import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ReferralRecord } from "@/lib/models/referral";
import { toReferralSummary } from "@/lib/models/referral";
import type { UserRecord } from "@/lib/models/user";
import {
  REFERRAL_CREDIT_PER_SIGNUP,
  REFERRAL_MAX_AWARDS,
  REFERRAL_MAX_CREDIT,
  generateReferralCode,
  isValidReferralCodeFormat,
  normalizeReferralCode,
  referralInvitePath,
  referralShortLinkPath,
} from "@/lib/referral";
import { requireAdmin, requireUserId } from "@/server/auth";
import { ensureUser } from "@/server/ensure-user";

async function allocateUniqueReferralCode(): Promise<string> {
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const users = db.collection<UserRecord>("users");

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = generateReferralCode();
    const taken = await users.findOne({ referralCode: code }, { projection: { _id: 1 } });
    if (!taken) return code;
  }

  return generateReferralCode(10);
}

export async function allocateReferralCodeForNewUser(): Promise<string> {
  return allocateUniqueReferralCode();
}

/** Ensure the user has a shareable referral code. */
export async function ensureReferralCode(user: UserRecord): Promise<UserRecord> {
  if (user.referralCode && isValidReferralCodeFormat(user.referralCode)) {
    return user;
  }

  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const code = await allocateUniqueReferralCode();
  const now = new Date();
  const updated = await db.collection<UserRecord>("users").findOneAndUpdate(
    {
      clerkId: user.clerkId,
      $or: [{ referralCode: { $exists: false } }, { referralCode: "" }],
    },
    { $set: { referralCode: code, updatedAt: now } },
    { returnDocument: "after" },
  );

  if (updated) return updated;
  const latest = await db.collection<UserRecord>("users").findOne({ clerkId: user.clerkId });
  return latest ?? { ...user, referralCode: code, updatedAt: now };
}

type AwardResult =
  | { awarded: true; credit: number; referrerClerkId: string }
  | { awarded: false; reason: string };

/**
 * Award referrer once when a new account is created with a valid ref code.
 * Idempotent via unique index on refereeClerkId.
 */
export async function awardReferralOnSignup(params: {
  refereeClerkId: string;
  referralCode: string;
}): Promise<AwardResult> {
  const code = normalizeReferralCode(params.referralCode);
  if (!isValidReferralCodeFormat(code)) {
    return { awarded: false, reason: "invalid_code" };
  }

  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const users = db.collection<UserRecord>("users");
  const referrals = db.collection<ReferralRecord>("referrals");

  const existingAward = await referrals.findOne({ refereeClerkId: params.refereeClerkId });
  if (existingAward) {
    return { awarded: false, reason: "already_awarded" };
  }

  const referee = await users.findOne({ clerkId: params.refereeClerkId });
  if (!referee) {
    return { awarded: false, reason: "referee_missing" };
  }
  if (referee.referredByClerkId) {
    return { awarded: false, reason: "already_referred" };
  }

  const referrer = await users.findOne({ referralCode: code });
  if (!referrer) {
    return { awarded: false, reason: "unknown_code" };
  }
  if (referrer.clerkId === params.refereeClerkId) {
    return { awarded: false, reason: "self_referral" };
  }

  const earned = referrer.referralCreditsEarned ?? 0;
  const count = referrer.referralCount ?? 0;
  if (count >= REFERRAL_MAX_AWARDS || earned >= REFERRAL_MAX_CREDIT) {
    await referrals.insertOne({
      referrerClerkId: referrer.clerkId,
      refereeClerkId: params.refereeClerkId,
      code,
      creditAwarded: 0,
      status: "skipped",
      skipReason: "cap_reached",
      createdAt: new Date(),
    });
    await users.updateOne(
      { clerkId: params.refereeClerkId },
      {
        $set: {
          referredByClerkId: referrer.clerkId,
          referredByCode: code,
          updatedAt: new Date(),
        },
      },
    );
    const { convertReferralClick: convertCapReferralClick } = await import(
      "@/server/referral-clicks.server"
    );
    await convertCapReferralClick({ code, refereeClerkId: params.refereeClerkId });
    return { awarded: false, reason: "cap_reached" };
  }

  const credit = Math.min(REFERRAL_CREDIT_PER_SIGNUP, REFERRAL_MAX_CREDIT - earned);
  const now = new Date();

  try {
    await referrals.insertOne({
      referrerClerkId: referrer.clerkId,
      refereeClerkId: params.refereeClerkId,
      code,
      creditAwarded: credit,
      status: "awarded",
      createdAt: now,
    });
  } catch (error) {
    const duplicate =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000;
    if (duplicate) return { awarded: false, reason: "already_awarded" };
    throw error;
  }

  await users.updateOne(
    { clerkId: params.refereeClerkId },
    {
      $set: {
        referredByClerkId: referrer.clerkId,
        referredByCode: code,
        updatedAt: now,
      },
    },
  );

  const { convertReferralClick } = await import("@/server/referral-clicks.server");
  await convertReferralClick({ code, refereeClerkId: params.refereeClerkId });

  await users.updateOne(
    { clerkId: referrer.clerkId },
    {
      $inc: {
        availableCredit: credit,
        referralCreditsEarned: credit,
        referralCount: 1,
      },
      $set: { updatedAt: now },
    },
  );

  await db.collection("notifications").insertOne({
    clerkUserId: referrer.clerkId,
    title: "Referral credit added",
    body: `Someone joined with your link. Your available credit went up by KES ${credit.toLocaleString("en-KE")}.`,
    type: "success",
    unread: true,
    createdAt: now,
  });

  return { awarded: true, credit, referrerClerkId: referrer.clerkId };
}

const claimInput = z.object({
  code: z.string().min(1).max(32),
});

/** Attach stored ref code after signup and award the referrer once. */
export const claimReferral = createServerFn({ method: "POST" })
  .validator((input: unknown) => claimInput.parse(input))
  .handler(async ({ data }) => {
    const clerkId = await requireUserId();
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const user = await db.collection<UserRecord>("users").findOne({ clerkId });
    if (!user) {
      return { awarded: false as const, reason: "referee_missing" };
    }

    return awardReferralOnSignup({
      refereeClerkId: clerkId,
      referralCode: data.code,
    });
  });

export type ReferralProgramStats = {
  code: string;
  invitePath: string;
  shortLinkPath: string;
  successfulReferrals: number;
  creditsEarned: number;
  creditPerReferral: number;
  maxReferrals: number;
  maxCredits: number;
  remainingSlots: number;
  linkClicks: number;
  signups: number;
  conversionRate: number;
  recentClicks: Array<{
    id: string;
    location: string;
    source: string;
    converted: boolean;
    createdAt: string;
  }>;
  recent: Array<{
    id: string;
    creditAwarded: number;
    status: string;
    createdAt: string;
  }>;
};

export const getReferralProgram = createServerFn({ method: "GET" }).handler(
  async (): Promise<ReferralProgramStats> => {
    const clerkId = await requireUserId();
    const user = await ensureReferralCode(await ensureUser(clerkId));
    const code = user.referralCode!;

    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const { getReferralClickStats } = await import("@/server/referral-clicks.server");
    const [recentDocs, clickStats] = await Promise.all([
      db
        .collection<ReferralRecord>("referrals")
        .find({ referrerClerkId: clerkId })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray(),
      getReferralClickStats(clerkId),
    ]);

    const successfulReferrals = user.referralCount ?? 0;
    const creditsEarned = user.referralCreditsEarned ?? 0;

    return {
      code,
      invitePath: referralInvitePath(code),
      shortLinkPath: referralShortLinkPath(code),
      successfulReferrals,
      creditsEarned,
      creditPerReferral: REFERRAL_CREDIT_PER_SIGNUP,
      maxReferrals: REFERRAL_MAX_AWARDS,
      maxCredits: REFERRAL_MAX_CREDIT,
      remainingSlots: Math.max(0, REFERRAL_MAX_AWARDS - successfulReferrals),
      linkClicks: clickStats.linkClicks,
      signups: clickStats.signups,
      conversionRate: clickStats.conversionRate,
      recentClicks: clickStats.recentClicks,
      recent: recentDocs.map((doc, index) => ({
        id: toReferralSummary(doc, index).id,
        creditAwarded: doc.creditAwarded,
        status: doc.status,
        createdAt: toReferralSummary(doc, index).createdAt,
      })),
    };
  },
);

export const listAdminReferrals = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const docs = await db
    .collection<ReferralRecord>("referrals")
    .find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  return docs.map((doc, index) => toReferralSummary(doc, index));
});
