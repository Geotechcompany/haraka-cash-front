import "@/lib/server-only";

import { createHash } from "node:crypto";

import { getRequestIP } from "@tanstack/react-start/server";

import type { ReferralClickRecord, ReferralClickSource } from "@/lib/models/referral-click";
import { toReferralClickSummary } from "@/lib/models/referral-click";
import type { UserRecord } from "@/lib/models/user";
import { isValidReferralCodeFormat, normalizeReferralCode } from "@/lib/referral";

const DEDUPE_WINDOW_MS = 5 * 60 * 1000;
const CONVERSION_MATCH_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

type GeoLocation = {
  country?: string;
  city?: string;
  region?: string;
};

function ipHashSecret(): string {
  return (
    process.env.REFERRAL_IP_HASH_SECRET ??
    process.env.CLERK_SECRET_KEY ??
    "haraka-referral-dev-secret"
  );
}

export function hashReferralIp(ip: string): string {
  return createHash("sha256").update(`${ip}:${ipHashSecret()}`).digest("hex");
}

export function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:")) return true;
  return false;
}

export async function lookupGeoFromIp(ip: string): Promise<GeoLocation | null> {
  if (isPrivateOrLocalIp(ip)) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city,regionName`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = (await response.json()) as {
      status?: string;
      country?: string;
      city?: string;
      regionName?: string;
    };

    if (data.status !== "success") return null;

    return {
      country: data.country,
      city: data.city,
      region: data.regionName,
    };
  } catch {
    return null;
  }
}

function requestIp(): string | undefined {
  return getRequestIP({ xForwardedFor: true });
}

export type TrackReferralClickResult =
  | { tracked: true }
  | { tracked: false; reason: "invalid_code" | "unknown_code" | "deduped" };

export async function recordReferralClick(params: {
  code: string;
  source: ReferralClickSource;
  ip?: string;
  userAgent?: string;
}): Promise<TrackReferralClickResult> {
  const code = normalizeReferralCode(params.code);
  if (!isValidReferralCodeFormat(code)) {
    return { tracked: false, reason: "invalid_code" };
  }

  const ip = params.ip ?? requestIp();
  if (!ip) {
    return { tracked: false, reason: "invalid_code" };
  }

  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const users = db.collection<UserRecord>("users");
  const clicks = db.collection<ReferralClickRecord>("referral_clicks");

  const referrer = await users.findOne({ referralCode: code }, { projection: { clerkId: 1 } });
  if (!referrer) {
    return { tracked: false, reason: "unknown_code" };
  }

  const ipHash = hashReferralIp(ip);
  const dedupeSince = new Date(Date.now() - DEDUPE_WINDOW_MS);
  const duplicate = await clicks.findOne(
    { ipHash, code, createdAt: { $gte: dedupeSince } },
    { projection: { _id: 1 } },
  );
  if (duplicate) {
    return { tracked: false, reason: "deduped" };
  }

  const geo = await lookupGeoFromIp(ip);
  const now = new Date();

  await clicks.insertOne({
    code,
    referrerClerkId: referrer.clerkId,
    ipHash,
    country: geo?.country,
    city: geo?.city,
    region: geo?.region,
    source: params.source,
    converted: false,
    userAgent: params.userAgent,
    createdAt: now,
  });

  return { tracked: true };
}

export async function convertReferralClick(params: {
  code: string;
  refereeClerkId: string;
  ip?: string;
}): Promise<void> {
  const code = normalizeReferralCode(params.code);
  if (!isValidReferralCodeFormat(code)) return;

  const ip = params.ip ?? requestIp();
  if (!ip) return;

  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const clicks = db.collection<ReferralClickRecord>("referral_clicks");
  const ipHash = hashReferralIp(ip);
  const matchSince = new Date(Date.now() - CONVERSION_MATCH_WINDOW_MS);
  const now = new Date();

  const matched = await clicks.findOneAndUpdate(
    {
      code,
      ipHash,
      converted: false,
      createdAt: { $gte: matchSince },
    },
    {
      $set: {
        converted: true,
        convertedAt: now,
        refereeClerkId: params.refereeClerkId,
      },
    },
    { sort: { createdAt: -1 }, returnDocument: "after" },
  );

  if (matched) return;

  await clicks.findOneAndUpdate(
    {
      code,
      converted: false,
      createdAt: { $gte: matchSince },
    },
    {
      $set: {
        converted: true,
        convertedAt: now,
        refereeClerkId: params.refereeClerkId,
      },
    },
    { sort: { createdAt: -1 } },
  );
}

export type ReferralClickStats = {
  linkClicks: number;
  signups: number;
  conversionRate: number;
  recentClicks: ReturnType<typeof toReferralClickSummary>[];
};

export async function getReferralClickStats(referrerClerkId: string): Promise<ReferralClickStats> {
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const clicks = db.collection<ReferralClickRecord>("referral_clicks");
  const users = db.collection<UserRecord>("users");

  const [linkClicks, user, recentDocs] = await Promise.all([
    clicks.countDocuments({ referrerClerkId }),
    users.findOne({ clerkId: referrerClerkId }, { projection: { referralCount: 1 } }),
    clicks
      .find({ referrerClerkId })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray(),
  ]);

  const signups = user?.referralCount ?? 0;
  const conversionRate =
    linkClicks > 0 ? Math.round((signups / linkClicks) * 1000) / 10 : 0;

  return {
    linkClicks,
    signups,
    conversionRate,
    recentClicks: recentDocs.map((doc, index) => toReferralClickSummary(doc, index)),
  };
}
