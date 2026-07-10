import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Wallet, TrendingUp, Clock, ArrowRight, Plus, CheckCircle2, AlertCircle, FileText,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import { AppShell } from "@/components/layout/app-shell";
import { StatCard } from "@/components/ui-extras/stat-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { kes } from "@/lib/loan";
import { cn } from "@/lib/utils";
import { getCurrentUser, listApplications } from "@/server/applications";
import { getDashboardStats, getUserLoanHistory } from "@/server/analytics";
import { listNotifications } from "@/server/notifications";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — HarakaCash" }] }),
  loader: async () => {
    const [user, applications, notifications, loanHistory, stats] = await Promise.all([
      getCurrentUser(),
      listApplications({ data: { scope: "mine" } }),
      listNotifications(),
      getUserLoanHistory(),
      getDashboardStats(),
    ]);
    return { user, applications, notifications, loanHistory, stats };
  },
  component: Dashboard,
});

const statusStyles: Record<string, string> = {
  Pending: "bg-warning/15 text-warning-foreground border-warning/30",
  Approved: "bg-success/15 text-success border-success/30",
  Declined: "bg-destructive/10 text-destructive border-destructive/20",
  Completed: "bg-muted text-muted-foreground",
  Disbursing: "bg-primary-soft text-primary border-primary/20",
};

function Dashboard() {
  const { user, applications, notifications, loanHistory, stats } = Route.useLoaderData();
  const recent = applications.slice(0, 5);
  const activeLoan = applications.find((a) => a.status === "Approved" || a.status === "Disbursing");
  return (
    <AppShell>
      {/* Welcome */}
      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 rounded-3xl gradient-brand text-white p-6 md:p-8 shadow-elevated relative overflow-hidden">
          <div className="absolute -top-20 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden />
          <p className="text-sm opacity-80">Good morning,</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">{user?.name ?? "HarakaCash user"}</h1>
          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs uppercase tracking-wide opacity-70">Available credit</p>
              <p className="text-3xl md:text-4xl font-bold mt-1 tabular-nums">{kes(user?.availableCredit ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide opacity-70">Eligibility score</p>
              <p className="text-3xl md:text-4xl font-bold mt-1 tabular-nums">{user?.eligibilityScore ?? 0}<span className="text-lg opacity-70">/100</span></p>
            </div>
          </div>
          <div className="mt-4 h-1.5 rounded-full bg-white/25 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${user?.eligibilityScore ?? 0}%` }} transition={{ delay: 0.3, duration: 1 }} className="h-full bg-white" />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild size="lg" className="rounded-xl bg-white text-primary hover:bg-white/90 font-semibold">
              <Link to="/apply"><Plus className="mr-1 h-4 w-4" /> Apply for loan</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="rounded-xl text-white hover:bg-white/10">
              <Link to="/loans">View loans <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-soft p-6">
          {activeLoan ? (
            <>
              <div className="flex items-center justify-between">
                <p className="font-semibold">Current loan</p>
                <Badge variant="secondary" className="rounded-full">{activeLoan.status}</Badge>
              </div>
              <p className="text-3xl font-bold mt-3 tabular-nums">{kes(activeLoan.amount)}</p>
              <p className="text-xs text-muted-foreground mt-1">{activeLoan.months} month term · {activeLoan.purpose}</p>
              <Button asChild variant="outline" className="mt-4 w-full rounded-xl">
                <Link to="/loans">View loan</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="font-semibold">No active loan</p>
              <p className="text-sm text-muted-foreground mt-2">Apply for a loan to see your current balance here.</p>
              <Button asChild className="mt-4 w-full rounded-xl gradient-brand text-white">
                <Link to="/apply"><Plus className="mr-1 h-4 w-4" /> Apply now</Link>
              </Button>
            </>
          )}
        </motion.div>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending" value={String(stats.pending)} icon={Clock} tone="warning" delay={0} />
        <StatCard label="Approved" value={String(stats.approved)} icon={CheckCircle2} tone="success" delay={0.05} />
        <StatCard label="Completed" value={String(stats.completed)} icon={Wallet} tone="primary" delay={0.1} />
        <StatCard label="Declined" value={String(stats.declined)} icon={AlertCircle} tone="danger" delay={0.15} />
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card-soft p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Monthly borrowing</p>
              <p className="text-xs text-muted-foreground">Last 6 months</p>
            </div>
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer>
              <AreaChart data={loanHistory}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
                <Area type="monotone" dataKey="borrowed" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-soft p-6">
          <p className="font-semibold">Repayment behaviour</p>
          <p className="text-xs text-muted-foreground">Borrowed vs repaid</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer>
              <BarChart data={loanHistory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
                <Bar dataKey="borrowed" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="repaid" fill="var(--color-chart-3)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent + notifications */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 card-soft overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <div>
              <p className="font-semibold">Recent applications</p>
              <p className="text-xs text-muted-foreground">Your latest loan requests</p>
            </div>
            <Button asChild variant="ghost" size="sm"><Link to="/loans">View all</Link></Button>
          </div>
          <div className="divide-y">
            {recent.map((a) => (
              <div key={a.id} className="px-6 py-4 flex items-center gap-4 hover:bg-muted/40 transition-colors">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-primary-soft text-primary grid place-items-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{a.id} · {a.purpose}</p>
                  <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })} · {a.months}mo</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{kes(a.amount)}</p>
                  <span className={cn("inline-block mt-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full border", statusStyles[a.status])}>{a.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-soft p-6">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Notifications</p>
            <Button asChild variant="ghost" size="sm"><Link to="/notifications">All</Link></Button>
          </div>
          <ul className="mt-3 space-y-3">
            {notifications.slice(0, 4).map((n) => (
              <li key={n.id} className="flex gap-3">
                <div className={cn("h-2 w-2 rounded-full mt-2 shrink-0", n.unread ? "bg-primary" : "bg-muted")} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Profile completion */}
      <div className="mt-6 card-soft p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold">Complete your profile</p>
          <p className="text-sm text-muted-foreground">Complete your profile to unlock higher loan limits.</p>
          <div className="mt-3">
            <Progress value={user?.profileComplete ?? 0} className="h-2" />
          </div>
        </div>
        <Button asChild className="rounded-xl gradient-brand text-white shadow-soft">
          <Link to="/profile">Finish setup</Link>
        </Button>
      </div>
    </AppShell>
  );
}
