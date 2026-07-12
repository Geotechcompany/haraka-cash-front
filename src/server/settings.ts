import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  PLATFORM_SETTINGS_KEY,
  toPlatformSettings,
  type PlatformSettingsRecord,
} from "@/lib/models/settings";
import { requireAdmin } from "@/server/auth";

const MASK_PATTERN = /^•+$/;

const platformSettingsInput = z
  .object({
    minLoanAmount: z.number().int().positive(),
    maxLoanAmount: z.number().int().positive(),
    minProcessingFee: z.number().int().nonnegative(),
    monthlyInterestRate: z.number().min(0).max(100),
    lateFeeRate: z.number().min(0).max(100),
    automatedApprovals: z.boolean(),
    fraudChecks: z.boolean(),
    smsNotifications: z.boolean(),
    maintenanceMode: z.boolean(),
    /**
     * Gemini key update:
     * - omit / undefined → keep existing
     * - string of only • (masked) → keep existing
     * - "" → clear stored key (fall back to env)
     * - any other string → save as new key
     */
    geminiApiKey: z.string().optional(),
  })
  .refine((settings) => settings.maxLoanAmount >= settings.minLoanAmount, {
    message: "Maximum loan amount must be greater than or equal to the minimum",
    path: ["maxLoanAmount"],
  });

export async function readPlatformSettingsRecord() {
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  return db.collection<PlatformSettingsRecord>("settings").findOne({ key: PLATFORM_SETTINGS_KEY });
}

export async function readPlatformSettings() {
  const settings = await readPlatformSettingsRecord();
  return toPlatformSettings(settings);
}

/**
 * Resolution order for Gemini:
 * 1. Admin-saved platform setting `geminiApiKey`
 * 2. `GEMINI_API_KEY` env
 * 3. `GOOGLE_GENERATIVE_AI_API_KEY` env
 */
export async function resolveGeminiApiKey() {
  const record = await readPlatformSettingsRecord();
  const fromAdmin = record?.geminiApiKey?.trim();
  if (fromAdmin) return fromAdmin;
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    ""
  );
}

export const getAdminPlatformSettings = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return readPlatformSettings();
});

export const getPublicLendingPolicy = createServerFn({ method: "GET" }).handler(async () => {
  const settings = await readPlatformSettings();
  return {
    minLoanAmount: settings.minLoanAmount,
    maxLoanAmount: settings.maxLoanAmount,
    minProcessingFee: settings.minProcessingFee,
    monthlyInterestRate: settings.monthlyInterestRate,
    maintenanceMode: settings.maintenanceMode,
  };
});

export const updateAdminPlatformSettings = createServerFn({ method: "POST" })
  .validator((input: unknown) => platformSettingsInput.parse(input))
  .handler(async ({ data }) => {
    const adminId = await requireAdmin();
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const now = new Date();

    const { geminiApiKey: geminiApiKeyInput, ...policyFields } = data;
    const $set: Partial<PlatformSettingsRecord> & {
      updatedBy: string;
      updatedAt: Date;
    } = {
      ...policyFields,
      updatedBy: adminId,
      updatedAt: now,
    };

    if (geminiApiKeyInput !== undefined) {
      const trimmed = geminiApiKeyInput.trim();
      if (trimmed === "") {
        $set.geminiApiKey = "";
      } else if (!MASK_PATTERN.test(trimmed) && !trimmed.startsWith("••••")) {
        $set.geminiApiKey = trimmed;
      }
      // masked / bullet-only value → leave existing key unchanged
    }

    await db.collection<PlatformSettingsRecord>("settings").updateOne(
      { key: PLATFORM_SETTINGS_KEY },
      {
        $set,
        $setOnInsert: { key: PLATFORM_SETTINGS_KEY, createdAt: now },
      },
      { upsert: true },
    );

    const { logAuditEvent } = await import("@/server/internal/audit-events");
    await logAuditEvent({
      actor: adminId,
      action: "Updated platform lending settings",
      target: PLATFORM_SETTINGS_KEY,
    });

    return readPlatformSettings();
  });
