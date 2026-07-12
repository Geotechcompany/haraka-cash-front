import "@/lib/server-only";

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  PLATFORM_SETTINGS_KEY,
  toPlatformSettings,
  type PlatformSettingsRecord,
} from "@/lib/models/settings";
import { requireAdmin } from "@/server/auth";

const platformSettingsInput = z
  .object({
    minLoanAmount: z.number().int().positive(),
    maxLoanAmount: z.number().int().positive(),
    monthlyInterestRate: z.number().min(0).max(100),
    lateFeeRate: z.number().min(0).max(100),
    automatedApprovals: z.boolean(),
    fraudChecks: z.boolean(),
    smsNotifications: z.boolean(),
    maintenanceMode: z.boolean(),
  })
  .refine((settings) => settings.maxLoanAmount >= settings.minLoanAmount, {
    message: "Maximum loan amount must be greater than or equal to the minimum",
    path: ["maxLoanAmount"],
  });

export async function readPlatformSettings() {
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const settings = await db
    .collection<PlatformSettingsRecord>("settings")
    .findOne({ key: PLATFORM_SETTINGS_KEY });
  return toPlatformSettings(settings);
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

    await db.collection<PlatformSettingsRecord>("settings").updateOne(
      { key: PLATFORM_SETTINGS_KEY },
      {
        $set: { ...data, updatedBy: adminId, updatedAt: now },
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
