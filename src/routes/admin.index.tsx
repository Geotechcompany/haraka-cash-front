import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { FileText, CheckCircle2, XCircle, TrendingUp, Users, Wallet, ArrowUpRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { AdminShell } from "@/components/layout/admin-shell";
import { StatCard } from "@/components/ui-extras/stat-card";
import { APPLICATIONS, MONTHLY_LOAN_VOLUME } from "@/lib/mock";
import { kes } from "@/lib/loan";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin — HarakaCash" }] }),
  component: AdminDashboard,
});

const statusStyles: Record<string, string> = {
  Pending: "bg-warning/15 text-warning-foreground border-warning/30",
  Approved: "bg-success/15 text-success border-success/30",
  Declined: "bg-destructive/10 text-destructive border-destructive/20",
  Completed: "bg-muted text-muted-foreground",
  Disbursing: "bg-primary-soft text-primary border-primary/20",
};

function AdminDashboard() {
  const approvalMix = [
    { name: "Approved", value: 62, color: "var(--color-chart-3)" },
    { name: "Pending", value: 22, color: "var(--color-chart-4)" },
    { name: "Declined", value: 16, color: "var(--color-chart-5)" },
  ];
  const recent = APPLICATIONS.slice(0, 6);
  return (
    <AdminShell title="Overview" subtitle="Snapshot of applications, disbursements and fees today.">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Applications today" value="184" hint="+12% vs yesterday" icon={FileText} tone="primary" />
        <StatCard label="Approved" value="112" hint="60.9% approval rate" icon={CheckCircle2} tone="success" delay={0.05} />
        <StatCard label="Declined" value="28" hint="Auto-declined" icon={XCircle} tone="danger" delay={0.1} />
        <StatCard label="Fees collected" value={kes(184_500)} hint="Today" icon={Wallet} tone="warning" delay={0.15} />
        <StatCard label="Total loans" value={kes(4_820_000)} hint="Outstanding" icon={TrendingUp} tone="primary" delay={0.2} />
        <StatCard label="Revenue MTD" value={kes(2_140_000)} hint="+18% MoM" icon={TrendingUp} tone="success" delay={0.25} />
        <StatCard label="Active borrowers" value="8,412" hint="+320 this week" icon={Users} tone="default" delay={0.3} />
        <StatCard label="Avg. ticket" value={kes(18_400)} hint="+4% MoM" icon={ArrowUpRight} tone="default" delay={0.35} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card-soft p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Loan volume</p>
              <p className="text-xs text-muted-foreground">Millions of KES</p>
            </div>
            <div className="text-sm text-success flex items-center gap-1"><TrendingUp className="h-4 w-4" /> +14.2%</div>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <AreaChart data={MONTHLY_LOAN_VOLUME}>
                <defs>
                  <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis tickLine={false} axisLine={false} className="text-xs" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
                <Area type="monotone" dataKey="volume" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#ga)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-soft p-6">
          <p className="font-semibold">Approval rate</p>
          <p className="text-xs text-muted-foreground">Last 30 days</p>
          <div className="mt-2 h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={approvalMix} innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none">
                  {approvalMix.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 card-soft overflow-hidden">
        <div className="p-6 flex items-center justify-between">
          <div>
            <p className="font-semibold">Latest applications</p>
            <p className="text-xs text-muted-foreground">Most recent submissions</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-6 py-3">Applicant</th>
                <th className="text-left font-medium px-6 py-3">Loan</th>
                <th className="text-left font-medium px-6 py-3 hidden md:table-cell">Employer</th>
                <th className="text-left font-medium px-6 py-3 hidden lg:table-cell">Score</th>
                <th className="text-left font-medium px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recent.map((a, i) => (
                <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full gradient-brand text-white grid place-items-center text-xs font-semibold shrink-0">{a.applicant[0]}</div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{a.applicant}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 tabular-nums font-semibold">{kes(a.amount)}</td>
                  <td className="px-6 py-4 hidden md:table-cell text-muted-foreground">{a.employer}</td>
                  <td className="px-6 py-4 hidden lg:table-cell tabular-nums">{a.eligibilityScore}</td>
                  <td className="px-6 py-4"><span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", statusStyles[a.status])}>{a.status}</span></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
