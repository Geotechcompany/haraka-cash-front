import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/layout/admin-shell";
import { StatCard } from "@/components/ui-extras/stat-card";
import { Banknote, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { kes } from "@/lib/loan";
import { listApplications } from "@/server/applications";

export const Route = createFileRoute("/admin/loans")({
  head: () => ({ meta: [{ title: "Loans — Admin" }] }),
  loader: () => listApplications({ data: { scope: "all" } }),
  component: AdminLoansPage,
});

function AdminLoansPage() {
  const applications = Route.useLoaderData();
  const active = applications.filter((a) => a.status === "Approved" || a.status === "Disbursing");
  return (
    <AdminShell title="Loans" subtitle="Portfolio overview and active loan book.">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Outstanding" value={kes(4_820_000)} icon={Banknote} tone="primary" />
        <StatCard label="Disbursed today" value={kes(184_000)} icon={TrendingUp} tone="success" delay={0.05} />
        <StatCard label="Overdue" value={kes(92_000)} icon={AlertTriangle} tone="warning" delay={0.1} />
        <StatCard label="Avg. tenure" value="3.2 mo" icon={Clock} delay={0.15} />
      </div>
      <div className="card-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-6 py-3">Loan</th>
              <th className="text-left font-medium px-6 py-3">Borrower</th>
              <th className="text-left font-medium px-6 py-3">Amount</th>
              <th className="text-left font-medium px-6 py-3 hidden md:table-cell">Tenure</th>
              <th className="text-left font-medium px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {active.slice(0, 12).map((a) => (
              <tr key={a.id} className="hover:bg-muted/30">
                <td className="px-6 py-4 font-mono text-xs">{a.id}</td>
                <td className="px-6 py-4">{a.applicant}</td>
                <td className="px-6 py-4 tabular-nums font-semibold">{kes(a.amount)}</td>
                <td className="px-6 py-4 hidden md:table-cell">{a.months} months</td>
                <td className="px-6 py-4"><span className="text-xs font-medium">{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
