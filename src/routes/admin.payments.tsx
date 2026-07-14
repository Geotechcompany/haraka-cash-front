import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/layout/admin-shell";
import { StatCard } from "@/components/ui-extras/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowUpFromLine, CreditCard, TrendingUp, Wallet } from "lucide-react";
import { kes } from "@/lib/loan";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getUserFacingError } from "@/lib/user-facing-error";
import {
  getWalletBalance,
  initiateAdminDeposit,
  initiateAdminWithdrawal,
  listPaymentTransactions,
  reconcilePendingWalletPayments,
} from "@/server/payments";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "Payments — Admin" }] }),
  loader: async () => {
    // SMPLY often never POSTs webhooks locally — align pending rows with wallet when possible.
    await reconcilePendingWalletPayments().catch(() => null);
    const [payments, wallet] = await Promise.all([
      listPaymentTransactions(),
      getWalletBalance().catch(() => ({
        balance: 0,
        currency: "KES",
        available: false,
        raw: null,
      })),
    ]);
    return { payments, wallet };
  },
  component: AdminPaymentsPage,
});

const statusStyles: Record<string, string> = {
  success: "bg-success/15 text-success border-success/30",
  pending: "bg-warning/15 text-warning-foreground border-warning/30",
  processing: "bg-primary-soft text-primary border-primary/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
};

function AdminPaymentsPage() {
  const { payments, wallet } = Route.useLoaderData();
  const deposit = useServerFn(initiateAdminDeposit);
  const withdraw = useServerFn(initiateAdminWithdrawal);
  const reconcile = useServerFn(reconcilePendingWalletPayments);

  const [depositPhone, setDepositPhone] = useState("");
  const [depositAmount, setDepositAmount] = useState("5");
  const [depositing, setDepositing] = useState(false);

  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("5000");
  const [withdrawing, setWithdrawing] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  const feesCollected = payments
    .filter((p) => p.kind === "processing_fee" && p.status === "success")
    .reduce((sum, p) => sum + p.amount, 0);
  const depositsCollected = payments
    .filter((p) => p.kind === "deposit" && p.status === "success")
    .reduce((sum, p) => sum + p.amount, 0);
  const withdrawalsPaid = payments
    .filter((p) => p.kind === "withdrawal" && p.status === "success")
    .reduce((sum, p) => sum + p.amount, 0);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositing(true);
    try {
      const result = await deposit({
        data: {
          phone: depositPhone,
          amount: Number(depositAmount),
        },
      });
      toast.message(result.message, {
        description: result.reference ? `Ref ${result.reference}` : undefined,
      });
      window.location.reload();
    } catch (error) {
      toast.error(getUserFacingError(error, "Deposit failed"));
    } finally {
      setDepositing(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawing(true);
    try {
      const result = await withdraw({
        data: {
          phone: withdrawPhone,
          amount: Number(withdrawAmount),
        },
      });
      if (result.status === "success") {
        toast.success(result.message);
      } else {
        toast.message(result.message, {
          description: result.reference ? `Ref ${result.reference}` : undefined,
        });
      }
      window.location.reload();
    } catch (error) {
      toast.error(getUserFacingError(error, "Withdrawal failed"));
    } finally {
      setWithdrawing(false);
    }
  };

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      const result = await reconcile();
      if (result.updated.length > 0) {
        toast.success(`Updated ${result.updated.length} payment(s)`, {
          description: result.reason,
        });
        window.location.reload();
        return;
      }
      toast.message(result.reason);
    } catch (error) {
      toast.error(getUserFacingError(error, "Could not refresh payment status"));
    } finally {
      setReconciling(false);
    }
  };

  return (
    <AdminShell
      title="Payments"
      subtitle="M-Pesa deposits, collections, wallet balance, and withdrawals."
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Wallet balance"
          value={wallet.available ? kes(wallet.balance) : "Unavailable"}
          icon={Wallet}
          tone="primary"
        />
        <StatCard
          label="Fees collected"
          value={kes(feesCollected)}
          icon={CreditCard}
          tone="success"
          delay={0.05}
        />
        <StatCard
          label="Deposits"
          value={kes(depositsCollected)}
          icon={ArrowUpFromLine}
          tone="success"
          delay={0.1}
        />
        <StatCard
          label="Withdrawn"
          value={kes(withdrawalsPaid)}
          icon={TrendingUp}
          tone="warning"
          delay={0.15}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <form onSubmit={handleDeposit} className="card-soft p-6 space-y-4">
            <div>
              <p className="font-semibold">Deposit funds</p>
              <p className="text-sm text-muted-foreground mt-1">
                Collect money into the SMPLY Pay wallet via M-Pesa STK push.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deposit-phone">M-Pesa number</Label>
              <Input
                id="deposit-phone"
                value={depositPhone}
                onChange={(e) => setDepositPhone(e.target.value)}
                className="h-11 rounded-xl"
                placeholder="0712 345 678"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deposit-amount">Amount (KES)</Label>
              <Input
                id="deposit-amount"
                type="number"
                min={1}
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="h-11 rounded-xl"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={depositing}
              className="w-full h-11 rounded-xl gradient-brand text-white font-semibold"
            >
              {depositing ? "Sending STK..." : "Send deposit STK"}
            </Button>
          </form>

          <form onSubmit={handleWithdraw} className="card-soft p-6 space-y-4">
            <div>
              <p className="font-semibold">Withdraw funds</p>
              <p className="text-sm text-muted-foreground mt-1">
                Send funds from your SMPLY Pay wallet to an M-Pesa number.
              </p>
              {!wallet.available && (
                <p className="mt-2 text-xs text-warning-foreground">
                  Wallet balance could not be loaded from SMPLY Pay. A green provider reply only means
                  the request was accepted — not that funds left the wallet.
                </p>
              )}
              {wallet.available && wallet.balance <= 0 && (
                <p className="mt-2 text-xs text-destructive">
                  Wallet balance is KES 0. Fund the wallet before withdrawing.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="withdraw-phone">M-Pesa number</Label>
              <Input
                id="withdraw-phone"
                value={withdrawPhone}
                onChange={(e) => setWithdrawPhone(e.target.value)}
                className="h-11 rounded-xl"
                placeholder="0712 345 678"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="withdraw-amount">Amount (KES)</Label>
              <Input
                id="withdraw-amount"
                type="number"
                min={1}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="h-11 rounded-xl"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={withdrawing || (wallet.available && wallet.balance <= 0)}
              className="w-full h-11 rounded-xl gradient-brand text-white font-semibold"
            >
              {withdrawing ? "Processing..." : "Withdraw to M-Pesa"}
            </Button>
          </form>
        </div>

        <div className="card-soft overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-6 py-3 border-b">
            <p className="text-sm text-muted-foreground">
              Rows update from M-Pesa callbacks. Use Refresh status if a deposit cleared but still shows pending.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={reconciling}
              onClick={() => void handleReconcile()}
              className="shrink-0 rounded-xl"
            >
              {reconciling ? "Refreshing…" : "Refresh status"}
            </Button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-6 py-3">Ref</th>
                <th className="text-left font-medium px-6 py-3">User</th>
                <th className="text-left font-medium px-6 py-3">Type</th>
                <th className="text-left font-medium px-6 py-3">Status</th>
                <th className="text-right font-medium px-6 py-3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((p) => (
                <tr key={p.reference}>
                  <td className="px-6 py-4 font-mono text-xs">{p.reference}</td>
                  <td className="px-6 py-4">{p.applicant ?? p.phone}</td>
                  <td className="px-6 py-4 capitalize">{p.kind.replace("_", " ")}</td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize",
                        statusStyles[p.status],
                      )}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums font-semibold">
                    {kes(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No payment transactions yet.
            </p>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
