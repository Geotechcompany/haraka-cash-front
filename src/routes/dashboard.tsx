import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  TrendingUp,
  ArrowRight,
  Plus,
  FileText,
  Gift,
  MousePointerClick,
  MapPin,
  Users,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { kes } from "@/lib/loan";
import { productTypeLabel } from "@/lib/lending-products";
import {
  applicationNeedsProcessingFee,
  applicationStatusLabel,
} from "@/lib/models/application";
import { cn } from "@/lib/utils";
import { getCurrentUser, listApplications } from "@/server/applications";
import { getDashboardStats, getUserLoanHistory } from "@/server/analytics";
import { listNotifications } from "@/server/notifications";
import { getReferralProgram } from "@/server/referrals";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — HarakaCash" }] }),
  loader: async () => {
    const [user, applications, notifications, loanHistory, stats, referrals] = await Promise.all([
      getCurrentUser(),
      listApplications({ data: { scope: "mine" } }),
      listNotifications(),
      getUserLoanHistory(),
      getDashboardStats(),
      getReferralProgram(),
    ]);
    return { user, applications, notifications, loanHistory, stats, referrals };
  },
  component: Dashboard,
});

const statusStyles: Record<string, string> = {
  Pending: "bg-warning/15 text-warning-foreground border-warning/30",
  Approved: "bg-success/15 text-success border-success/30",
  Declined: "bg-destructive/10 text-destructive border-destructive/20",
  Completed: "bg-muted text-muted-foreground",
  Disbursing: "bg-primary-soft text-primary border-primary/20",
  UnderReview: "bg-warning/15 text-warning-foreground border-warning/30",
  DocumentsRequired: "bg-primary-soft text-primary border-primary/20",
  AdditionalActionRequired: "bg-destructive/10 text-destructive border-destructive/20",
};

const springEnter = { type: "spring" as const, bounce: 0, duration: 0.4 };
const STAGGER_MS = 0.05;

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { user, applications, notifications, loanHistory, stats, referrals } = Route.useLoaderData();
  const reduceMotion = useReducedMotion();
  const recent = applications.slice(0, 5);
  const activeLoan = applications.find(
    (a) =>
      a.status === "Approved" ||
      a.status === "AdditionalActionRequired" ||
      a.status === "Disbursing" ||
      a.status === "UnderReview",
  );
  const unread = notifications.filter((n) => n.unread).length;
  const profilePct = user?.profileComplete ?? 0;
  const score = user?.eligibilityScore ?? 0;
  const greeting = greetingForHour(new Date().getHours());

  const enter = (delay = 0) =>
    reduceMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2, delay } }
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { ...springEnter, delay },
        };

  const heroMotion = enter(0);
  const sideMotion = enter(STAGGER_MS);
  const stripMotion = enter(STAGGER_MS * 2);

  return (
    <AppShell>
      {/* Primary composition: credit + next action */}
      <div className="grid gap-4 lg:grid-cols-5 lg:gap-5">
        <motion.section
          {...heroMotion}
          className="relative overflow-hidden rounded-3xl gradient-brand p-6 text-white shadow-elevated md:p-8 lg:col-span-3"
        >
          <div
            className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"
            aria-hidden
          />
          <p className="text-sm text-white/75">
            {greeting},{" "}
            <span className="font-medium text-white">{user?.name?.split(" ")[0] ?? "there"}</span>
          </p>
          <p className="mt-6 text-[11px] font-semibold tracking-[0.14em] text-white/65 uppercase">
            Available credit
          </p>
          <p className="mt-1 font-display text-4xl font-bold tracking-tight tabular-nums md:text-5xl">
            {kes(user?.availableCredit ?? 0)}
          </p>

          <div className="mt-6 max-w-sm">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs text-white/70">Eligibility score</p>
              <p className="text-sm font-semibold tabular-nums">
                {score}
                <span className="text-white/60">/100</span>
              </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
              <motion.div
                className="h-full origin-left bg-white"
                initial={reduceMotion ? { opacity: 0.4 } : { scaleX: 0 }}
                animate={reduceMotion ? { opacity: 1 } : { scaleX: 1 }}
                transition={
                  reduceMotion
                    ? { duration: 0.2 }
                    : { type: "spring", bounce: 0, duration: 0.55, delay: 0.12 }
                }
                style={reduceMotion ? { width: `${score}%` } : { width: `${score}%` }}
              />
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            <Button
              asChild
              size="lg"
              className="rounded-xl bg-white font-semibold text-primary hover:bg-white/90"
            >
              <Link to="/apply">
                <Plus className="mr-1 h-4 w-4" /> Apply for a loan
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="rounded-xl text-white hover:bg-white/10"
            >
              <Link to="/loans">
                My loans <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="rounded-xl text-white hover:bg-white/10"
            >
              <Link to="/referrals">
                <Gift className="mr-1 h-4 w-4" /> Refer & earn
              </Link>
            </Button>
          </div>
        </motion.section>

        <motion.aside {...sideMotion} className="flex flex-col gap-4 lg:col-span-2">
          <div className="card-soft flex flex-1 flex-col p-5 md:p-6">
            {activeLoan ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Current loan
                  </p>
                  <Badge variant="secondary" className="rounded-full">
                    {applicationStatusLabel(activeLoan.status)}
                  </Badge>
                </div>
                <p className="mt-3 font-display text-3xl font-bold tracking-tight tabular-nums">
                  {kes(activeLoan.amount)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeLoan.months}-month term · {activeLoan.purpose}
                </p>
                {applicationNeedsProcessingFee(activeLoan) ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Pay the processing fee
                    {activeLoan.feeAmount != null ? (
                      <> ({kes(activeLoan.feeAmount)})</>
                    ) : null}{" "}
                    to continue.
                  </p>
                ) : null}
                <div className="mt-auto flex flex-col gap-2 pt-4">
                  {applicationNeedsProcessingFee(activeLoan) ? (
                    <Button asChild className="rounded-xl gradient-brand text-white shadow-soft">
                      <Link to="/decision" search={{ applicationId: activeLoan.id }}>
                        Pay processing fee
                      </Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link to="/loans">View loan</Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Current loan
                </p>
                <p className="mt-3 text-lg font-semibold tracking-tight">None active</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  When you take a loan, balance and status show here.
                </p>
                <Button asChild className="mt-auto rounded-xl gradient-brand text-white">
                  <Link to="/apply">
                    <Plus className="mr-1 h-4 w-4" /> Apply now
                  </Link>
                </Button>
              </>
            )}
          </div>

          {profilePct < 100 && (
            <div className="card-soft p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold tracking-tight">Finish your profile</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Higher limits unlock as details are complete.
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                  {profilePct}%
                </span>
              </div>
              <Progress value={profilePct} className="mt-3 h-1.5" />
              <Button asChild variant="ghost" size="sm" className="mt-2 -ml-2 rounded-lg">
                <Link to="/profile">
                  Continue <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          )}
        </motion.aside>
      </div>

      {/* Compact pipeline — one surface, not four cards */}
      <motion.div
        {...stripMotion}
        className="mt-5 grid grid-cols-2 divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-soft sm:grid-cols-4 sm:divide-x"
      >
        {[
          { label: "Pending", value: stats.pending },
          { label: "Approved", value: stats.approved },
          { label: "Completed", value: stats.completed },
          { label: "Declined", value: stats.declined },
        ].map((item, i) => (
          <div
            key={item.label}
            className={cn(
              "px-4 py-3.5 sm:px-5",
              i < 2 && "border-b border-border sm:border-b-0",
            )}
          >
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {item.label}
            </p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight tabular-nums">{item.value}</p>
          </div>
        ))}
      </motion.div>

      <motion.section
        {...enter(STAGGER_MS * 2.5)}
        className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-6">
          <div>
            <h2 className="font-semibold tracking-tight">Referral performance</h2>
            <p className="text-xs text-muted-foreground">Link clicks and signups from your invite</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="rounded-lg">
            <Link to="/referrals">Manage referrals</Link>
          </Button>
        </div>
        <div className="grid grid-cols-3 divide-border border-t border-border sm:divide-x">
          <div className="border-b border-border px-4 py-4 sm:border-b-0 sm:px-5">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Link clicks
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xl font-semibold tabular-nums">
              <MousePointerClick className="h-4 w-4 text-primary" aria-hidden />
              {referrals.linkClicks}
            </p>
          </div>
          <div className="border-b border-border px-4 py-4 sm:border-b-0 sm:px-5">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Signups
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xl font-semibold tabular-nums">
              <Users className="h-4 w-4 text-primary" aria-hidden />
              {referrals.signups}
            </p>
          </div>
          <div className="col-span-3 px-4 py-4 sm:col-span-1 sm:px-5">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Conversion
            </p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums">{referrals.conversionRate}%</p>
          </div>
        </div>
        {referrals.recentClicks.length > 0 && (
          <ul className="divide-y divide-border border-t border-border">
            {referrals.recentClicks.slice(0, 3).map((click) => (
              <li
                key={click.id}
                className="flex items-center justify-between gap-3 px-5 py-3 md:px-6"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    {click.location}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(click.createdAt).toLocaleDateString("en-KE", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <Badge
                  variant={click.converted ? "default" : "secondary"}
                  className="shrink-0 rounded-full"
                >
                  {click.converted ? "Signed up" : "Clicked"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </motion.section>

      {/* Activity */}
      <div className="mt-6 grid gap-4 lg:grid-cols-5 lg:gap-5">
        <motion.section
          {...enter(STAGGER_MS * 3)}
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft lg:col-span-3"
        >
          <div className="flex items-center justify-between gap-3 px-5 py-4 md:px-6">
            <div>
              <h2 className="font-semibold tracking-tight">Recent applications</h2>
              <p className="text-xs text-muted-foreground">Your latest loan requests</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="rounded-lg">
              <Link to="/loans">View all</Link>
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {recent.length === 0 ? (
              <li className="px-5 py-10 text-center text-sm text-muted-foreground md:px-6">
                No applications yet.{" "}
                <Link to="/apply" className="font-medium text-primary hover:underline">
                  Apply for a loan
                </Link>
              </li>
            ) : (
              recent.map((app, i) => (
                <motion.li
                  key={app.id}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  transition={
                    reduceMotion
                      ? { duration: 0.15, delay: 0.15 + i * STAGGER_MS }
                      : { ...springEnter, delay: 0.15 + i * STAGGER_MS }
                  }
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors duration-150 ease-[var(--ease-out)] hover:bg-muted/40 md:gap-4 md:px-6"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{app.purpose}</p>
                    <p className="text-xs text-muted-foreground">
                      {productTypeLabel(app.productType)} ·{" "}
                      {new Date(app.createdAt).toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      · {app.months} mo · {app.id}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{kes(app.amount)}</p>
                    <span
                      className={cn(
                        "mt-0.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        statusStyles[app.status],
                      )}
                    >
                      {applicationStatusLabel(app.status)}
                    </span>
                  </div>
                </motion.li>
              ))
            )}
          </ul>
        </motion.section>

        <motion.section
          {...enter(STAGGER_MS * 4)}
          className="rounded-2xl border border-border bg-card p-5 shadow-soft md:p-6 lg:col-span-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold tracking-tight">Alerts</h2>
              <p className="text-xs text-muted-foreground">
                {unread > 0 ? `${unread} unread` : "All caught up"}
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="rounded-lg">
              <Link to="/notifications">All</Link>
            </Button>
          </div>
          <ul className="mt-4 space-y-3">
            {notifications.slice(0, 4).map((n, i) => (
              <motion.li
                key={n.id}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0.15, delay: 0.2 + i * STAGGER_MS }
                    : { ...springEnter, delay: 0.2 + i * STAGGER_MS }
                }
                className="flex gap-3"
              >
                <div
                  className={cn(
                    "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
                    n.unread ? "bg-primary" : "bg-muted-foreground/30",
                  )}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{n.time}</p>
                </div>
              </motion.li>
            ))}
            {notifications.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">No alerts yet</li>
            )}
          </ul>
        </motion.section>
      </div>

      {/* Charts — secondary, denser */}
      <motion.div
        {...enter(STAGGER_MS * 5)}
        className="mt-6 grid gap-4 lg:grid-cols-2 lg:gap-5"
      >
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold tracking-tight">Monthly borrowing</h2>
              <p className="text-xs text-muted-foreground">Last 6 months</p>
            </div>
            <TrendingUp className="h-4 w-4 text-success" aria-hidden />
          </div>
          <div className="mt-3 h-48 md:h-56">
            <ResponsiveContainer>
              <AreaChart data={loanHistory}>
                <defs>
                  <linearGradient id="dashBorrow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="borrowed"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  fill="url(#dashBorrow)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft md:p-6">
          <h2 className="font-semibold tracking-tight">Borrowed vs repaid</h2>
          <p className="text-xs text-muted-foreground">Repayment behaviour</p>
          <div className="mt-3 h-48 md:h-56">
            <ResponsiveContainer>
              <BarChart data={loanHistory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                  }}
                />
                <Bar dataKey="borrowed" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="repaid" fill="var(--color-chart-3)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    </AppShell>
  );
}
