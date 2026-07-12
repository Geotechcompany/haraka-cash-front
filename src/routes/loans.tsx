import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Search, Plus, CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { kes } from "@/lib/loan";
import { applicationStatusLabel } from "@/lib/models/application";
import { cn } from "@/lib/utils";
import { listApplications } from "@/server/applications";

export const Route = createFileRoute("/loans")({
  head: () => ({ meta: [{ title: "My loans — HarakaCash" }] }),
  loader: () => listApplications({ data: { scope: "mine" } }),
  component: LoansPage,
});

const statusStyles: Record<string, string> = {
  Pending: "bg-warning/15 text-warning-foreground border-warning/30",
  Approved: "bg-success/15 text-success border-success/30",
  Declined: "bg-destructive/10 text-destructive border-destructive/20",
  Completed: "bg-muted text-muted-foreground",
  Disbursing: "bg-primary-soft text-primary border-primary/20",
  UnderReview: "bg-warning/15 text-warning-foreground border-warning/30",
  DocumentsRequired: "bg-primary-soft text-primary border-primary/20",
};

const springEnter = { type: "spring" as const, bounce: 0, duration: 0.35 };
const STAGGER = 0.045;

function LoansPage() {
  const applications = Route.useLoaderData();
  const reduceMotion = useReducedMotion();
  const activeLoan = applications.find(
    (a) =>
      a.status === "Approved" ||
      a.status === "Disbursing" ||
      a.status === "UnderReview",
  );
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const filtered = applications.filter((a) => {
    const matchesQuery =
      a.id.toLowerCase().includes(q.toLowerCase()) ||
      a.purpose.toLowerCase().includes(q.toLowerCase());
    if (!matchesQuery) return false;
    if (tab === "all") return true;
    if (tab === "pending") {
      return (
        a.status === "Pending" ||
        a.status === "UnderReview" ||
        a.status === "DocumentsRequired"
      );
    }
    return a.status.toLowerCase() === tab;
  });

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">My loans</h1>
          <p className="mt-1 text-muted-foreground">Applications, offers, and repayments.</p>
        </div>
        <Button asChild className="h-11 rounded-xl gradient-brand text-white shadow-soft">
          <Link to="/apply">
            <Plus className="mr-1 h-4 w-4" /> New loan
          </Link>
        </Button>
      </div>

      {activeLoan && (
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0.2 } : springEnter}
          className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-soft md:p-6"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Active loan
              </p>
              <p className="mt-1 font-display text-2xl font-bold tracking-tight tabular-nums md:text-3xl">
                {kes(activeLoan.amount)}
              </p>
            </div>
            <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              {applicationStatusLabel(activeLoan.status)}
            </span>
          </div>
          <ol className="grid gap-2 sm:grid-cols-4 sm:gap-3">
            {[
              {
                l: "Fee paid",
                done:
                  activeLoan.status === "UnderReview" || activeLoan.status === "Disbursing",
                icon: CheckCircle2,
              },
              {
                l: "CRB review",
                done: activeLoan.status === "Disbursing",
                icon: activeLoan.status === "UnderReview" ? Clock : CheckCircle2,
              },
              {
                l: "Disbursed",
                done: activeLoan.status === "Disbursing",
                icon: CheckCircle2,
              },
              { l: "Repayment", done: false, icon: Clock },
            ].map((step) => (
              <li
                key={step.l}
                className={cn(
                  "rounded-xl border p-3",
                  step.done ? "border-success/30 bg-success/5" : "bg-muted/30",
                )}
              >
                <step.icon
                  className={cn("h-4 w-4", step.done ? "text-success" : "text-muted-foreground")}
                />
                <p className="mt-2 text-xs font-semibold">{step.l}</p>
              </li>
            ))}
          </ol>
        </motion.div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by ID or purpose"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 rounded-xl pl-9"
          />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-11 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg">
              All
            </TabsTrigger>
            <TabsTrigger value="pending" className="rounded-lg">
              Pending
            </TabsTrigger>
            <TabsTrigger value="approved" className="rounded-lg">
              Approved
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-lg">
              Completed
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-2.5">
        {filtered.map((a, i) => (
          <motion.div
            key={a.id}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0.15, delay: i * STAGGER }
                : { ...springEnter, delay: i * STAGGER }
            }
            className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft transition-[box-shadow] duration-200 ease-[var(--ease-out)] hover:shadow-elevated md:flex-nowrap md:p-5"
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-sm font-semibold text-primary">
              {a.id.slice(-3)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold">{a.purpose}</p>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                    statusStyles[a.status],
                  )}
                >
                  {applicationStatusLabel(a.status)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {a.id} · {a.months} mo ·{" "}
                {new Date(a.createdAt).toLocaleDateString("en-KE", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold tracking-tight tabular-nums">{kes(a.amount)}</p>
              <p className="text-xs text-muted-foreground">Score {a.eligibilityScore}</p>
            </div>
            <Button variant="ghost" size="sm" className="rounded-lg">
              Details <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted">
              <XCircle className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="mt-4 font-semibold">No loans match</p>
            <p className="text-sm text-muted-foreground">Try another filter or search term.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
