import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getUserFacingError } from "@/lib/user-facing-error";
import { AdminShell } from "@/components/layout/admin-shell";
import { StatCard } from "@/components/ui-extras/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Banknote, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { kes } from "@/lib/loan";
import { getAdminLoanPortfolio, markLoanDisbursed, recordLoanRepayment } from "@/server/loans";

export const Route = createFileRoute("/admin/loans")({
  head: () => ({ meta: [{ title: "Loans — Admin" }] }),
  loader: () => getAdminLoanPortfolio(),
  component: AdminLoansPage,
});

function AdminLoansPage() {
  const { stats, loans } = Route.useLoaderData();
  const router = useRouter();
  const disburse = useServerFn(markLoanDisbursed);
  const recordRepayment = useServerFn(recordLoanRepayment);
  const [selectedLoan, setSelectedLoan] = useState<(typeof loans)[number]>();
  const [repaymentLoan, setRepaymentLoan] = useState<(typeof loans)[number]>();
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const markDisbursed = async (loanNumber: string) => {
    setIsSubmitting(true);
    try {
      await disburse({ data: loanNumber });
      toast.success("Loan marked as disbursed");
      await router.invalidate();
    } catch (error) {
      toast.error(getUserFacingError(error, "Could not update loan"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRepayment = (loan: (typeof loans)[number]) => {
    setRepaymentLoan(loan);
    setAmount(String(Math.min(loan.outstandingBalance, loan.repaymentSchedule[0]?.amount ?? 0)));
    setReference("");
  };

  const submitRepayment = async () => {
    if (!repaymentLoan) return;
    setIsSubmitting(true);
    try {
      await recordRepayment({
        data: {
          loanNumber: repaymentLoan.id,
          amount: Number(amount),
          reference: reference || undefined,
        },
      });
      toast.success("Repayment recorded");
      setRepaymentLoan(undefined);
      await router.invalidate();
    } catch (error) {
      toast.error(getUserFacingError(error, "Could not record repayment"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminShell title="Loans" subtitle="Portfolio overview and active loan book.">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Outstanding"
          value={kes(stats.outstanding)}
          icon={Banknote}
          tone="primary"
        />
        <StatCard
          label="Disbursed today"
          value={kes(stats.disbursedToday)}
          icon={TrendingUp}
          tone="success"
          delay={0.05}
        />
        <StatCard
          label="Overdue"
          value={kes(stats.overdue)}
          icon={AlertTriangle}
          tone="warning"
          delay={0.1}
        />
        <StatCard
          label="Avg. tenure"
          value={`${stats.avgTenureMonths} mo`}
          icon={Clock}
          delay={0.15}
        />
      </div>
      <div className="card-soft overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-6 py-3">Loan</th>
              <th className="text-left font-medium px-6 py-3">Borrower</th>
              <th className="text-left font-medium px-6 py-3">Amount</th>
              <th className="text-left font-medium px-6 py-3 hidden md:table-cell">Tenure</th>
              <th className="text-left font-medium px-6 py-3">Status</th>
              <th className="text-right font-medium px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loans.map((loan) => (
              <tr key={loan.id} className="hover:bg-muted/30">
                <td className="px-6 py-4 font-mono text-xs">{loan.id}</td>
                <td className="px-6 py-4">{loan.borrowerName}</td>
                <td className="px-6 py-4 tabular-nums font-semibold">
                  {kes(loan.outstandingBalance)}
                  <span className="block text-xs font-normal text-muted-foreground">
                    of {kes(loan.totalPayable)}
                  </span>
                </td>
                <td className="px-6 py-4 hidden md:table-cell">{loan.months} months</td>
                <td className="px-6 py-4">
                  <span className="text-xs font-medium">{loan.status}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedLoan(loan)}>
                      Details
                    </Button>
                    {loan.status === "Disbursing" && (
                      <Button
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => markDisbursed(loan.id)}
                      >
                        Mark disbursed
                      </Button>
                    )}
                    {loan.status !== "Paid" && (
                      <Button size="sm" variant="secondary" onClick={() => openRepayment(loan)}>
                        Repayment
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {loans.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                  No loans have been created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={Boolean(selectedLoan)}
        onOpenChange={(open) => !open && setSelectedLoan(undefined)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedLoan?.id}</DialogTitle>
            <DialogDescription>{selectedLoan?.borrowerName}</DialogDescription>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <LoanDetail label="Principal" value={kes(selectedLoan.amount)} />
                <LoanDetail label="Outstanding" value={kes(selectedLoan.outstandingBalance)} />
                <LoanDetail label="Status" value={selectedLoan.status} />
                <LoanDetail
                  label="Due date"
                  value={new Date(selectedLoan.dueDate).toLocaleDateString("en-KE")}
                />
              </div>
              <div className="max-h-64 overflow-auto rounded-xl border">
                {selectedLoan.repaymentSchedule.map((installment) => (
                  <div
                    key={installment.installmentNumber}
                    className="flex items-center justify-between border-b px-4 py-3 text-sm last:border-0"
                  >
                    <div>
                      <p className="font-medium">Installment {installment.installmentNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(installment.dueDate).toLocaleDateString("en-KE")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{kes(installment.amount)}</p>
                      <p className="text-xs text-muted-foreground">{installment.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(repaymentLoan)}
        onOpenChange={(open) => !open && setRepaymentLoan(undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record repayment</DialogTitle>
            <DialogDescription>
              {repaymentLoan?.id} · {repaymentLoan?.borrowerName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="repayment-amount">Amount (KES)</Label>
            <Input
              id="repayment-amount"
              type="number"
              min={1}
              max={repaymentLoan?.outstandingBalance}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="repayment-reference">Payment reference</Label>
            <Input
              id="repayment-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Optional; generated when blank"
            />
          </div>
          <DialogFooter>
            <Button disabled={isSubmitting || Number(amount) <= 0} onClick={submitRepayment}>
              {isSubmitting ? "Saving..." : "Record repayment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function LoanDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
