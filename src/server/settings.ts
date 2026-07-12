import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  PLATFORM_SETTINGS_KEY,
  QUOTE_AI_PROVIDERS,
  toPlatformSettings,
  type PlatformSettingsRecord,
} from "@/lib/models/settings";
import { requireAdmin } from "@/server/auth";

const MASK_PATTERN = /^•+$/;

function isMaskedSecretInput(value: string) {
  return MASK_PATTERN.test(value) || value.startsWith("••••");
}

/**
 * Secret key update semantics (gemini / openai):
 * - omit / undefined → keep existing
 * - string of only • (masked) or starts with •••• → keep existing
 * - "" → clear stored key (fall back to env)
 * - any other string → save as new key
 */
function applySecretKeyUpdate(
  input: string | undefined,
  field: "geminiApiKey" | "openaiApiKey",
  $set: Partial<PlatformSettingsRecord>,
) {
  if (input === undefined) return;
  const trimmed = input.trim();
  if (trimmed === "") {
    $set[field] = "";
  } else if (!isMaskedSecretInput(trimmed)) {
    $set[field] = trimmed;
  }
}

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
    quoteAiProvider: z.enum(QUOTE_AI_PROVIDERS),
    geminiApiKey: z.string().optional(),
    openaiApiKey: z.string().optional(),
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

/**
 * Resolution order for OpenAI:
 * 1. Admin-saved platform setting `openaiApiKey`
 * 2. `OPENAI_API_KEY` env
 */
export async function resolveOpenAiApiKey() {
  const record = await readPlatformSettingsRecord();
  const fromAdmin = record?.openaiApiKey?.trim();
  if (fromAdmin) return fromAdmin;
  return process.env.OPENAI_API_KEY?.trim() || "";
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

    const {
      geminiApiKey: geminiApiKeyInput,
      openaiApiKey: openaiApiKeyInput,
      ...policyFields
    } = data;

    const $set: Partial<PlatformSettingsRecord> & {
      updatedBy: string;
      updatedAt: Date;
    } = {
      ...policyFields,
      updatedBy: adminId,
      updatedAt: now,
    };

    applySecretKeyUpdate(geminiApiKeyInput, "geminiApiKey", $set);
    applySecretKeyUpdate(openaiApiKeyInput, "openaiApiKey", $set);

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
