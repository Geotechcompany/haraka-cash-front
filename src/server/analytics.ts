import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";

import type { LoanHistoryPoint } from "@/lib/models/analytics";
import { requireAdmin } from "@/server/auth";

export const getMonthlyLoanVolume = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { buildMonthlyLoanVolume } = await import("@/server/internal/monthly-loan-volume");
  return buildMonthlyLoanVolume();
});

export const getUserLoanHistory = createServerFn({ method: "GET" }).handler(async () => {
  const { userId } = await auth();
  if (!userId) return [] as LoanHistoryPoint[];

  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const doc = await db
    .collection<{ clerkUserId: string; points: LoanHistoryPoint[] }>("loan_history")
    .findOne({ clerkUserId: userId });

  return doc?.points ?? [];
});

export const getDashboardStats = createServerFn({ method: "GET" }).handler(async () => {
  const { userId } = await auth();
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const filter = userId ? { clerkUserId: userId } : { clerkUserId: "__none__" };
  const applications = await db.collection("applications").find(filter).toArray();

  const counts = {
    pending: 0,
    approved: 0,
    completed: 0,
    declined: 0,
  };

  for (const app of applications) {
    const status = String(app.status).toLowerCase();
    if (status === "pending" || status === "disbursing") counts.pending += 1;
    else if (status === "approved") counts.approved += 1;
    else if (status === "completed") counts.completed += 1;
    else if (status === "declined") counts.declined += 1;
  }

  return counts;
});

export const getPortfolioMetrics = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const { buildMonthlyLoanVolume } = await import("@/server/internal/monthly-loan-volume");
  const [activeUsers, borrowerRows, applicationRows, monthlyVolume] = await Promise.all([
    db.collection("users").countDocuments({ status: { $ne: "Suspended" } }),
    db
      .collection("applications")
      .aggregate<{ borrowers: number; repeatBorrowers: number }>([
        { $match: { clerkUserId: { $type: "string" } } },
        { $group: { _id: "$clerkUserId", applicationCount: { $sum: 1 } } },
        {
          $group: {
            _id: null,
            borrowers: { $sum: 1 },
            repeatBorrowers: {
              $sum: { $cond: [{ $gt: ["$applicationCount", 1] }, 1, 0] },
            },
          },
        },
      ])
      .toArray(),
    db
      .collection("applications")
      .aggregate<{ total: number; declined: number }>([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            declined: { $sum: { $cond: [{ $eq: ["$status", "Declined"] }, 1, 0] } },
          },
        },
      ])
      .toArray(),
    buildMonthlyLoanVolume(),
  ]);
  const borrowers = borrowerRows[0]?.borrowers ?? 0;
  const repeatBorrowers = borrowerRows[0]?.repeatBorrowers ?? 0;
  const totalApplications = applicationRows[0]?.total ?? 0;
  const declinedApplications = applicationRows[0]?.declined ?? 0;
  const repeatRate = borrowers ? Math.round((repeatBorrowers / borrowers) * 100) : 0;
  const defaultRate = totalApplications
    ? Math.round((declinedApplications / totalApplications) * 1000) / 10
    : 0;

  return {
    activeUsers,
    repeatRate,
    defaultRate,
    monthlyVolume,
  };
});
