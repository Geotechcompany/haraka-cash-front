import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/layout/admin-shell";
import { StatCard } from "@/components/ui-extras/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, TrendingUp, Wallet, ArrowDownToLine } from "lucide-react";
import { kes } from "@/lib/loan";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getWalletBalance,
  initiateAdminWithdrawal,
  listPaymentTransactions,
} from "@/server/payments";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "Payments — Admin" }] }),
  loader: async () => {
    const [payments, wallet] = await Promise.all([
      listPaymentTransactions(),
      getWalletBalance().catch(() => ({ balance: 0, currency: "KES", raw: null })),
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
  const withdraw = useServerFn(initiateAdminWithdrawal);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("5000");
  const [withdrawing, setWithdrawing] = useState(false);

  const feesToday = payments
    .filter((p) => p.kind === "processing_fee" && p.status === "success")
    .reduce((sum, p) => sum + p.amount, 0);
  const withdrawalsToday = payments
    .filter((p) => p.kind === "withdrawal" && p.status === "success")
    .reduce((sum, p) => sum + p.amount, 0);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawing(true);
    try {
      const result = await withdraw({
        data: {
          phone,
          amount: Number(amount),
        },
      });
      toast.success(result.message);
      window.location.reload();
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Withdrawal failed";
      // TanStack often prefixes thrown server messages with "Server Error".
      const message = raw.replace(/^Server Error\s*/i, "").trim() || raw;
      toast.error(message);
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <AdminShell
      title="Payments"
      subtitle="M-Pesa collections, wallet balance, and admin withdrawals."
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Wallet balance" value={kes(wallet.balance)} icon={Wallet} tone="primary" />
        <StatCard
          label="Fees collected"
          value={kes(feesToday)}
          icon={CreditCard}
          tone="success"
          delay={0.05}
        />
        <StatCard
          label="Withdrawn"
          value={kes(withdrawalsToday)}
          icon={TrendingUp}
          tone="warning"
          delay={0.1}
        />
        <StatCard
          label="Transactions"
          value={String(payments.length)}
          icon={ArrowDownToLine}
          tone="default"
          delay={0.15}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form onSubmit={handleWithdraw} className="card-soft p-6 space-y-4 h-fit">
          <div>
            <p className="font-semibold">Withdraw funds</p>
            <p className="text-sm text-muted-foreground mt-1">
              Send funds from your SMPLY Pay wallet to an M-Pesa number.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="withdraw-phone">M-Pesa number</Label>
            <Input
              id="withdraw-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11 rounded-xl"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={withdrawing}
            className="w-full h-11 rounded-xl gradient-brand text-white font-semibold"
          >
            {withdrawing ? "Processing..." : "Withdraw to M-Pesa"}
          </Button>
        </form>

        <div className="card-soft overflow-hidden">
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
