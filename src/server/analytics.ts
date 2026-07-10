import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";

import type { LoanHistoryPoint } from "@/lib/models/analytics";

export const getMonthlyLoanVolume = createServerFn({ method: "GET" }).handler(async () => {
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
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const applications = await db.collection("applications").find({}).toArray();
  const users = await db.collection("users").find({}).toArray();

  const borrowers = new Set(applications.map((a) => a.clerkUserId).filter(Boolean));
  const repeatBorrowers = [...borrowers].filter((id) => {
    return applications.filter((a) => a.clerkUserId === id).length > 1;
  }).length;

  const repeatRate = borrowers.size ? Math.round((repeatBorrowers / borrowers.size) * 100) : 0;
  const defaultRate = applications.length
    ? Math.round((applications.filter((a) => a.status === "Declined").length / applications.length) * 1000) / 10
    : 0;

  const { buildMonthlyLoanVolume } = await import("@/server/internal/monthly-loan-volume");

  return {
    activeUsers: users.length,
    repeatRate,
    defaultRate,
    monthlyVolume: await buildMonthlyLoanVolume(),
  };
});
