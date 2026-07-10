import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { Search, Plus, CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APPLICATIONS } from "@/lib/mock";
import { kes } from "@/lib/loan";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/loans")({
  head: () => ({ meta: [{ title: "My loans — HarakaCash" }] }),
  component: LoansPage,
});

const statusStyles: Record<string, string> = {
  Pending: "bg-warning/15 text-warning-foreground border-warning/30",
  Approved: "bg-success/15 text-success border-success/30",
  Declined: "bg-destructive/10 text-destructive border-destructive/20",
  Completed: "bg-muted text-muted-foreground",
  Disbursing: "bg-primary-soft text-primary border-primary/20",
};

function LoansPage() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const filtered = APPLICATIONS.filter((a) =>
    (tab === "all" || a.status.toLowerCase() === tab) &&
    (a.id.toLowerCase().includes(q.toLowerCase()) || a.purpose.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My loans</h1>
          <p className="mt-1 text-muted-foreground">Track applications, offers and repayments.</p>
        </div>
        <Button asChild className="rounded-xl h-11 gradient-brand text-white shadow-soft"><Link to="/apply"><Plus className="mr-1 h-4 w-4" /> New loan</Link></Button>
      </div>

      {/* Active loan timeline */}
      <div className="card-soft p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Active loan</p>
            <p className="text-2xl font-bold tabular-nums">{kes(15000)}</p>
          </div>
          <span className="text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1">Disbursed</span>
        </div>
        <ol className="grid sm:grid-cols-4 gap-3">
          {[
            { l: "Pending Review", done: true, icon: CheckCircle2 },
            { l: "Approved", done: true, icon: CheckCircle2 },
            { l: "Disbursed", done: true, icon: CheckCircle2 },
            { l: "Repayment", done: false, icon: Clock },
          ].map((s, i) => (
            <li key={i} className={cn("rounded-xl border p-3", s.done ? "bg-success/5 border-success/30" : "bg-muted/30")}>
              <s.icon className={cn("h-4 w-4", s.done ? "text-success" : "text-muted-foreground")} />
              <p className="mt-2 text-xs font-semibold">{s.l}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search loans" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 h-11 rounded-xl" />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="rounded-xl h-11">
            <TabsTrigger value="all" className="rounded-lg">All</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-lg">Pending</TabsTrigger>
            <TabsTrigger value="approved" className="rounded-lg">Approved</TabsTrigger>
            <TabsTrigger value="completed" className="rounded-lg">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-3">
        {filtered.map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="card-soft p-5 flex flex-wrap md:flex-nowrap items-center gap-4 hover:shadow-elevated transition-shadow">
            <div className="h-11 w-11 shrink-0 rounded-xl bg-primary-soft text-primary grid place-items-center font-semibold text-sm">{a.id.slice(-3)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold truncate">{a.id}</p>
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", statusStyles[a.status])}>{a.status}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{a.purpose} · {a.months} mo · {new Date(a.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold tabular-nums">{kes(a.amount)}</p>
              <p className="text-xs text-muted-foreground">Score {a.eligibilityScore}</p>
            </div>
            <Button variant="ghost" size="sm" className="rounded-lg">Details <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-muted grid place-items-center"><XCircle className="h-8 w-8 text-muted-foreground" /></div>
            <p className="mt-4 font-semibold">No loans found</p>
            <p className="text-sm text-muted-foreground">Try a different filter or search term.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
