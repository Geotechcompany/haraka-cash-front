import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ApplicationRecord } from "@/lib/models/application";
import type { UserRecord } from "@/lib/models/user";
import { requireAdmin } from "@/server/auth";

export type AdminUserStatus = "Active" | "Suspended";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  county: string;
  eligibilityScore: number;
  availableCredit: number;
  status: AdminUserStatus;
  applicationCount: number;
  totalBorrowed: number;
  createdAt: string;
};

export const listAdminUsers = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { getDb } = await import("@/lib/db");
  const db = await getDb();

  const [users, applicationTotals] = await Promise.all([
    db.collection<UserRecord>("users").find({}).sort({ createdAt: -1 }).toArray(),
    db
      .collection<ApplicationRecord>("applications")
      .aggregate<{ _id: string; applicationCount: number; totalBorrowed: number }>([
        {
          $group: {
            _id: "$clerkUserId",
            applicationCount: { $sum: 1 },
            totalBorrowed: { $sum: "$amount" },
          },
        },
      ])
      .toArray(),
  ]);

  const totalsByUser = new Map(applicationTotals.map((entry) => [entry._id, entry]));

  return users.map((user): AdminUser => {
    const totals = totalsByUser.get(user.clerkId);
    const storedStatus = (user as UserRecord & { status?: AdminUserStatus }).status;
    return {
      id: user.clerkId,
      name:
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.email ||
        "HarakaCash user",
      email: user.email ?? "",
      phone: user.phone ?? "",
      county: user.county ?? "",
      eligibilityScore: user.eligibilityScore,
      availableCredit: user.availableCredit,
      status: storedStatus === "Suspended" ? "Suspended" : "Active",
      applicationCount: totals?.applicationCount ?? 0,
      totalBorrowed: totals?.totalBorrowed ?? 0,
      createdAt:
        user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt),
    };
  });
});

const updateUserStatusInput = z.object({
  clerkId: z.string().min(1),
  status: z.enum(["Active", "Suspended"]),
});

export const updateAdminUserStatus = createServerFn({ method: "POST" })
  .validator((input: unknown) => updateUserStatusInput.parse(input))
  .handler(async ({ data }) => {
    const adminId = await requireAdmin();
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const result = await db
      .collection<UserRecord>("users")
      .updateOne(
        { clerkId: data.clerkId },
        { $set: { status: data.status, updatedAt: new Date() } },
      );

    if (!result.matchedCount) throw new Error("User not found");

    await db.collection("notifications").insertOne({
      clerkUserId: data.clerkId,
      title: data.status === "Suspended" ? "Account suspended" : "Account restored",
      body:
        data.status === "Suspended"
          ? "Your HarakaCash account has been suspended. Contact support for help."
          : "Your HarakaCash account access has been restored.",
      type: data.status === "Suspended" ? "warning" : "success",
      unread: true,
      createdAt: new Date(),
    });

    const { logAuditEvent } = await import("@/server/internal/audit-events");
    await logAuditEvent({
      actor: adminId,
      action: `${data.status} user`,
      target: data.clerkId,
    });

    return { ok: true };
  });
