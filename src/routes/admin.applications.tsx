import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search, Eye, Check, X, FileUp } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { kes } from "@/lib/loan";
import { applicationStatusLabel } from "@/lib/models/application";
import { cn } from "@/lib/utils";
import { getAdminApplication, listApplications, reviewApplication } from "@/server/applications";

export const Route = createFileRoute("/admin/applications")({
  head: () => ({ meta: [{ title: "Applications — Admin" }] }),
  loader: () => listApplications({ data: { scope: "all" } }),
  component: ApplicationsPage,
});

const statusStyles: Record<string, string> = {
  Pending: "bg-warning/15 text-warning-foreground border-warning/30",
  Approved: "bg-success/15 text-success border-success/30",
  Declined: "bg-destructive/10 text-destructive border-destructive/20",
  Completed: "bg-muted text-muted-foreground",
  Disbursing: "bg-primary-soft text-primary border-primary/20",
  DocumentsRequired: "bg-primary-soft text-primary border-primary/20",
  UnderReview: "bg-warning/15 text-warning-foreground border-warning/30",
};

function ApplicationsPage() {
  const applications = Route.useLoaderData();
  const router = useRouter();
  const getDetail = useServerFn(getAdminApplication);
  const review = useServerFn(reviewApplication);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getDetail>>>();
  const [reviewTarget, setReviewTarget] = useState<(typeof applications)[number]>();
  const [reviewAction, setReviewAction] = useState<"decline" | "requestDocuments">();
  const [note, setNote] = useState("");
  const [documents, setDocuments] = useState("National ID, Proof of income");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const rows = applications.filter((a) => {
    const matchesQuery =
      a.applicant.toLowerCase().includes(q.toLowerCase()) ||
      a.id.toLowerCase().includes(q.toLowerCase());
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

  const approve = async (applicationNumber: string) => {
    setIsSubmitting(true);
    try {
      const result = await review({ data: { applicationNumber, action: "approve" } });
      toast.success(
        result.status === "Disbursing"
          ? "CRB cleared — disbursement started"
          : "Application approved",
      );
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not approve application");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDetail = async (applicationNumber: string) => {
    try {
      setDetail(await getDetail({ data: applicationNumber }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load application");
    }
  };

  const openReview = (
    application: (typeof applications)[number],
    action: "decline" | "requestDocuments",
  ) => {
    setReviewTarget(application);
    setReviewAction(action);
    setNote("");
  };

  const submitReview = async () => {
    if (!reviewTarget || !reviewAction) return;
    setIsSubmitting(true);
    try {
      await review({
        data: {
          applicationNumber: reviewTarget.id,
          action: reviewAction,
          note: note || undefined,
          requiredDocuments:
            reviewAction === "requestDocuments"
              ? documents
                  .split(",")
                  .map((document) => document.trim())
                  .filter(Boolean)
              : undefined,
        },
      });
      toast.success(reviewAction === "decline" ? "Application declined" : "Documents requested");
      setReviewTarget(undefined);
      setReviewAction(undefined);
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not review application");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminShell title="Applications" subtitle="Review, approve, or decline applications.">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-11 rounded-xl"
          />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="rounded-xl h-11">
            <TabsTrigger value="all" className="rounded-lg">
              All
            </TabsTrigger>
            <TabsTrigger value="pending" className="rounded-lg">
              Pending
            </TabsTrigger>
            <TabsTrigger value="approved" className="rounded-lg">
              Approved
            </TabsTrigger>
            <TabsTrigger value="declined" className="rounded-lg">
              Declined
            </TabsTrigger>
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
                      <div className="h-8 w-8 rounded-full gradient-brand text-white grid place-items-center text-xs font-semibold shrink-0">
                        {a.applicant[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{a.applicant}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {a.id} · {a.phone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 tabular-nums font-semibold">
                    {kes(a.amount)}
                    <span className="text-xs text-muted-foreground font-normal">
                      {" "}
                      / {a.months}mo
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell text-muted-foreground">
                    {a.employer}
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell tabular-nums">
                    {kes(a.monthlyIncome)}
                  </td>
                  <td className="px-6 py-4">
                    <ScoreBar value={a.riskScore} tone="danger" />
                  </td>
                  <td className="px-6 py-4">
                    <ScoreBar value={a.eligibilityScore} tone="success" />
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        statusStyles[a.status],
                      )}
                    >
                      {applicationStatusLabel(a.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1">
                      <Button
                        onClick={() => openDetail(a.id)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        disabled={
                          isSubmitting ||
                          a.status === "Approved" ||
                          a.status === "Disbursing" ||
                          a.status === "Declined" ||
                          a.status === "Completed"
                        }
                        onClick={() => approve(a.id)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-success"
                        aria-label="Approve"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        disabled={isSubmitting || a.status === "Declined"}
                        onClick={() => openReview(a, "decline")}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        aria-label="Decline"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        disabled={isSubmitting}
                        onClick={() => openReview(a, "requestDocuments")}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Request docs"
                      >
                        <FileUp className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detail?.id}</DialogTitle>
            <DialogDescription>Application review details</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Detail label="Applicant" value={detail.applicant} />
              <Detail label="Phone" value={detail.phone} />
              <Detail label="M-Pesa" value={detail.mpesaNumber} />
              <Detail label="Amount" value={kes(detail.amount)} />
              <Detail label="Term" value={`${detail.months} months`} />
              <Detail label="Income" value={kes(detail.monthlyIncome)} />
              <Detail label="Employer" value={detail.employer} />
              <Detail label="Purpose" value={detail.purpose} />
              <Detail label="Status" value={applicationStatusLabel(detail.status)} />
              {detail.reviewNotes && <Detail label="Review notes" value={detail.reviewNotes} />}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reviewTarget && reviewAction)}
        onOpenChange={(open) => {
          if (!open) {
            setReviewTarget(undefined);
            setReviewAction(undefined);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "decline" ? "Decline application" : "Request documents"}
            </DialogTitle>
            <DialogDescription>
              {reviewTarget?.id} · {reviewTarget?.applicant}
            </DialogDescription>
          </DialogHeader>
          {reviewAction === "requestDocuments" && (
            <div className="space-y-1.5">
              <Label htmlFor="required-documents">Required documents</Label>
              <Input
                id="required-documents"
                value={documents}
                onChange={(event) => setDocuments(event.target.value)}
                placeholder="Comma-separated document names"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="review-note">Note to borrower</Label>
            <Textarea
              id="review-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Explain the decision or document requirements"
            />
          </div>
          <DialogFooter>
            <Button type="button" disabled={isSubmitting} onClick={submitReview}>
              {isSubmitting ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
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
