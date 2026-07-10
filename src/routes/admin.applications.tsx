import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Eye, Check, X, FileUp } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APPLICATIONS } from "@/lib/mock";
import { kes } from "@/lib/loan";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/applications")({
  head: () => ({ meta: [{ title: "Applications — Admin" }] }),
  component: ApplicationsPage,
});

const statusStyles: Record<string, string> = {
  Pending: "bg-warning/15 text-warning-foreground border-warning/30",
  Approved: "bg-success/15 text-success border-success/30",
  Declined: "bg-destructive/10 text-destructive border-destructive/20",
  Completed: "bg-muted text-muted-foreground",
  Disbursing: "bg-primary-soft text-primary border-primary/20",
};

function ApplicationsPage() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const rows = APPLICATIONS.filter((a) =>
    (tab === "all" || a.status.toLowerCase() === tab) &&
    (a.applicant.toLowerCase().includes(q.toLowerCase()) || a.id.toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <AdminShell title="Applications" subtitle="Review, approve, or decline applications.">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or ID" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 h-11 rounded-xl" />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="rounded-xl h-11">
            <TabsTrigger value="all" className="rounded-lg">All</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-lg">Pending</TabsTrigger>
            <TabsTrigger value="approved" className="rounded-lg">Approved</TabsTrigger>
            <TabsTrigger value="declined" className="rounded-lg">Declined</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="card-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-6 py-3">Applicant</th>
                <th className="text-left font-medium px-6 py-3">Loan</th>
                <th className="text-left font-medium px-6 py-3 hidden md:table-cell">Employer</th>
                <th className="text-left font-medium px-6 py-3 hidden lg:table-cell">Income</th>
                <th className="text-left font-medium px-6 py-3">Risk</th>
                <th className="text-left font-medium px-6 py-3">Eligibility</th>
                <th className="text-left font-medium px-6 py-3">Status</th>
                <th className="text-right font-medium px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full gradient-brand text-white grid place-items-center text-xs font-semibold shrink-0">{a.applicant[0]}</div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{a.applicant}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.id} · {a.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 tabular-nums font-semibold">{kes(a.amount)}<span className="text-xs text-muted-foreground font-normal"> / {a.months}mo</span></td>
                  <td className="px-6 py-4 hidden md:table-cell text-muted-foreground">{a.employer}</td>
                  <td className="px-6 py-4 hidden lg:table-cell tabular-nums">{kes(a.monthlyIncome)}</td>
                  <td className="px-6 py-4"><ScoreBar value={a.riskScore} tone="danger" /></td>
                  <td className="px-6 py-4"><ScoreBar value={a.eligibilityScore} tone="success" /></td>
                  <td className="px-6 py-4"><span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", statusStyles[a.status])}>{a.status}</span></td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="View"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-success" aria-label="Approve"><Check className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Decline"><X className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Request docs"><FileUp className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

function ScoreBar({ value, tone }: { value: number; tone: "success" | "danger" }) {
  const color = tone === "success" ? "bg-success" : "bg-destructive";
  return (
    <div className="flex items-center gap-2 min-w-24">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums w-6 text-right">{value}</span>
    </div>
  );
}
