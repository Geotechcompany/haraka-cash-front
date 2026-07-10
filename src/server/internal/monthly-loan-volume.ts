import "@/lib/server-only";

import type { ApplicationRecord } from "@/lib/models/application";
import type { MonthlyLoanVolume } from "@/lib/models/analytics";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function buildMonthlyLoanVolume(): Promise<MonthlyLoanVolume[]> {
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const stored = await db.collection<{ key: string; data: MonthlyLoanVolume[] }>("analytics").findOne({
    key: "monthly_loan_volume",
  });
  if (stored?.data?.length) return stored.data;

  const applications = await db.collection<ApplicationRecord>("applications").find({}).toArray();
  const buckets = new Map<string, { volume: number; applications: number }>();

  for (const app of applications) {
    const created = app.createdAt instanceof Date ? app.createdAt : new Date(app.createdAt);
    const key = `${created.getFullYear()}-${created.getMonth()}`;
    const current = buckets.get(key) ?? { volume: 0, applications: 0 };
    current.volume += app.amount / 1_000_000;
    current.applications += 1;
    buckets.set(key, current);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-9)
    .map(([key, value]) => {
      const month = Number(key.split("-")[1]);
      return {
        month: monthNames[month] ?? key,
        volume: Number(value.volume.toFixed(1)),
        applications: value.applications,
      };
    });
}
