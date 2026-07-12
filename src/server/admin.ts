import { createServerFn } from "@tanstack/react-start";

import { kes } from "@/lib/loan";
import { requireAdmin } from "@/server/auth";

export const getAdminOverviewStats = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [applicationRows, feeRows, loanRows, activeBorrowers] = await Promise.all([
    db
      .collection("applications")
      .aggregate<{
        total: number;
        today: number;
        approved: number;
        declined: number;
        pending: number;
        totalAmount: number;
      }>([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            today: { $sum: { $cond: [{ $gte: ["$createdAt", today] }, 1, 0] } },
            approved: {
              $sum: { $cond: [{ $in: ["$status", ["Approved", "Disbursing"]] }, 1, 0] },
            },
            declined: { $sum: { $cond: [{ $eq: ["$status", "Declined"] }, 1, 0] } },
            pending: {
              $sum: {
                $cond: [{ $in: ["$status", ["Pending", "DocumentsRequired"]] }, 1, 0],
              },
            },
            totalAmount: { $sum: "$amount" },
          },
        },
      ])
      .toArray(),
    db
      .collection("payments")
      .aggregate<{ total: number }>([
        {
          $match: {
            status: "success",
            kind: "processing_fee",
            createdAt: { $gte: today },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ])
      .toArray(),
    db
      .collection("loans")
      .aggregate<{ total: number }>([
        { $match: { status: { $in: ["Disbursing", "Active", "Overdue"] } } },
        { $group: { _id: null, total: { $sum: "$outstandingBalance" } } },
      ])
      .toArray(),
    db.collection("users").countDocuments({ status: { $ne: "Suspended" } }),
  ]);

  const applications = applicationRows[0] ?? {
    total: 0,
    today: 0,
    approved: 0,
    declined: 0,
    pending: 0,
    totalAmount: 0,
  };
  const approved = applications.approved;
  const declined = applications.declined;
  const approvalRate = applications.total ? Math.round((approved / applications.total) * 100) : 0;
  const feesToday = feeRows[0]?.total ?? 0;
  const outstanding = loanRows[0]?.total ?? 0;
  const avgTicket = applications.total
    ? Math.round(applications.totalAmount / applications.total)
    : 0;

  const approvalMix = [
    { name: "Approved", value: approved, color: "var(--color-chart-3)" },
    {
      name: "Pending",
      value: applications.pending,
      color: "var(--color-chart-4)",
    },
    { name: "Declined", value: declined, color: "var(--color-chart-5)" },
  ].filter((item) => item.value > 0);

  return {
    applicationsToday: applications.today,
    approved,
    declined,
    approvalRate,
    feesToday,
    outstanding,
    avgTicket,
    activeBorrowers,
    approvalMix,
    feesTodayFormatted: kes(feesToday),
    outstandingFormatted: kes(outstanding),
    avgTicketFormatted: kes(avgTicket),
  };
});
