import { createServerFn } from "@tanstack/react-start";

import type { ApplicationRecord } from "@/lib/models/application";
import type { PaymentRecord } from "@/lib/models/payment";
import { kes } from "@/lib/loan";

export const getAdminOverviewStats = createServerFn({ method: "GET" }).handler(async () => {  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const [applications, payments, users] = await Promise.all([
    db.collection<ApplicationRecord>("applications").find({}).toArray(),
    db.collection<PaymentRecord>("payments").find({ status: "success" }).toArray(),
    db.collection("users").find({}).toArray(),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const applicationsToday = applications.filter((app) => {
    const created = app.createdAt instanceof Date ? app.createdAt : new Date(app.createdAt);
    return created >= today;
  });

  const approved = applications.filter((a) => a.status === "Approved" || a.status === "Disbursing").length;
  const declined = applications.filter((a) => a.status === "Declined").length;
  const approvalRate = applications.length
    ? Math.round((approved / applications.length) * 100)
    : 0;

  const feesToday = payments
    .filter((p) => p.kind === "processing_fee" && p.createdAt >= today)
    .reduce((sum, p) => sum + p.amount, 0);

  const outstanding = applications
    .filter((a) => a.status === "Approved" || a.status === "Disbursing")
    .reduce((sum, a) => sum + a.amount, 0);

  const avgTicket = applications.length
    ? Math.round(applications.reduce((sum, a) => sum + a.amount, 0) / applications.length)
    : 0;

  const approvalMix = [
    { name: "Approved", value: approved, color: "var(--color-chart-3)" },
    { name: "Pending", value: applications.filter((a) => a.status === "Pending").length, color: "var(--color-chart-4)" },
    { name: "Declined", value: declined, color: "var(--color-chart-5)" },
  ].filter((item) => item.value > 0);

  return {
    applicationsToday: applicationsToday.length,
    approved,
    declined,
    approvalRate,
    feesToday,
    outstanding,
    avgTicket,
    activeBorrowers: users.length,
    approvalMix,
    feesTodayFormatted: kes(feesToday),
    outstandingFormatted: kes(outstanding),
    avgTicketFormatted: kes(avgTicket),
  };
});
