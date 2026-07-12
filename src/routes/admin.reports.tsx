import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/layout/admin-shell";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { getMonthlyLoanVolume } from "@/server/analytics";

const reports = [
  { title: "Monthly disbursement report", type: "disbursements" },
  { title: "Repayment performance", type: "repayments" },
  { title: "Fees & revenue", type: "fees" },
] as const;

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Reports — Admin" }] }),
  loader: () => getMonthlyLoanVolume(),
  component: AdminReportsPage,
});

function AdminReportsPage() {
  const monthlyVolume = Route.useLoaderData();
  return (
    <AdminShell title="Reports" subtitle="Download portfolio and compliance reports.">
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {reports.map((report) => (
          <div key={report.type} className="card-soft p-5">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary grid place-items-center">
                <Download className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{report.title}</p>
                <p className="text-xs text-muted-foreground">Protected admin export</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button asChild size="sm" variant="outline" className="rounded-lg">
                <a href={`/api/admin/reports/${report.type}/csv`} download>
                  CSV
                </a>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-lg">
                <a href={`/api/admin/reports/${report.type}/pdf`} download>
                  PDF
                </a>
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="card-soft p-6">
        <p className="font-semibold">Monthly applications</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer>
            <BarChart data={monthlyVolume}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis tickLine={false} axisLine={false} className="text-xs" />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)",
                }}
              />
              <Bar dataKey="applications" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AdminShell>
  );
}
