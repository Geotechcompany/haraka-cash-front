import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/layout/admin-shell";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { MONTHLY_LOAN_VOLUME } from "@/lib/mock";
import { StatCard } from "@/components/ui-extras/stat-card";
import { Users, TrendingUp, Percent } from "lucide-react";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin" }] }),
  component: () => (
    <AdminShell title="Analytics" subtitle="Cohort behaviour and portfolio health.">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Active users" value="8,412" icon={Users} tone="primary" />
        <StatCard label="Repeat rate" value="68%" icon={TrendingUp} tone="success" delay={0.05} />
        <StatCard label="Default rate" value="1.9%" icon={Percent} tone="warning" delay={0.1} />
      </div>
      <div className="card-soft p-6">
        <p className="font-semibold">Daily applications</p>
        <div className="mt-4 h-80">
          <ResponsiveContainer>
            <LineChart data={MONTHLY_LOAN_VOLUME}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis tickLine={false} axisLine={false} className="text-xs" />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
              <Line type="monotone" dataKey="applications" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="volume" stroke="var(--color-chart-3)" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AdminShell>
  ),
});
