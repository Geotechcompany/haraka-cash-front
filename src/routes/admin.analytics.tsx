import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/layout/admin-shell";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { StatCard } from "@/components/ui-extras/stat-card";
import { Users, TrendingUp, Percent } from "lucide-react";
import { getPortfolioMetrics } from "@/server/analytics";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin" }] }),
  loader: () => getPortfolioMetrics(),
  component: AdminAnalyticsPage,
});

function AdminAnalyticsPage() {
  const { activeUsers, repeatRate, defaultRate, monthlyVolume } = Route.useLoaderData();
  return (
    <AdminShell title="Analytics" subtitle="Cohort behaviour and portfolio health.">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Active users" value={String(activeUsers)} icon={Users} tone="primary" />
        <StatCard label="Repeat rate" value={`${repeatRate}%`} icon={TrendingUp} tone="success" delay={0.05} />
        <StatCard label="Decline rate" value={`${defaultRate}%`} icon={Percent} tone="warning" delay={0.1} />
      </div>
      <div className="card-soft p-6">
        <p className="font-semibold">Monthly applications</p>
        <div className="mt-4 h-80">
          {monthlyVolume.length > 0 ? (
            <ResponsiveContainer>
              <LineChart data={monthlyVolume}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis tickLine={false} axisLine={false} className="text-xs" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
                <Line type="monotone" dataKey="applications" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="volume" stroke="var(--color-chart-3)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full grid place-items-center text-sm text-muted-foreground">No analytics data yet</div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
