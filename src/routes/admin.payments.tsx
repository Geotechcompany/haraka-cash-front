import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/layout/admin-shell";
import { StatCard } from "@/components/ui-extras/stat-card";
import { CreditCard, TrendingUp, Wallet } from "lucide-react";
import { kes } from "@/lib/loan";
import { APPLICATIONS } from "@/lib/mock";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "Payments — Admin" }] }),
  component: () => (
    <AdminShell title="Payments" subtitle="Disbursements, repayments and fees.">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Repayments today" value={kes(342_000)} icon={CreditCard} tone="success" />
        <StatCard label="Fees today" value={kes(184_500)} icon={Wallet} tone="warning" delay={0.05} />
        <StatCard label="Net revenue" value={kes(1_240_000)} icon={TrendingUp} tone="primary" delay={0.1} />
      </div>
      <div className="card-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-6 py-3">Ref</th>
              <th className="text-left font-medium px-6 py-3">User</th>
              <th className="text-left font-medium px-6 py-3">Type</th>
              <th className="text-left font-medium px-6 py-3">Channel</th>
              <th className="text-right font-medium px-6 py-3">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {APPLICATIONS.slice(0, 10).map((a, i) => (
              <tr key={a.id}>
                <td className="px-6 py-4 font-mono text-xs">PMT-{9000 + i}</td>
                <td className="px-6 py-4">{a.applicant}</td>
                <td className="px-6 py-4">{i % 2 === 0 ? "Repayment" : "Fee"}</td>
                <td className="px-6 py-4">M-Pesa</td>
                <td className="px-6 py-4 text-right tabular-nums font-semibold">{kes(Math.round(a.amount * (i % 2 === 0 ? 0.35 : 0.02)))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  ),
});
