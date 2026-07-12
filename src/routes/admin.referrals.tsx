import { createFileRoute } from "@tanstack/react-router";
import { Gift } from "lucide-react";

import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { kes } from "@/lib/loan";
import { listAdminReferrals } from "@/server/referrals";

export const Route = createFileRoute("/admin/referrals")({
  head: () => ({ meta: [{ title: "Referrals — Admin" }] }),
  loader: () => listAdminReferrals(),
  component: AdminReferralsPage,
});

function AdminReferralsPage() {
  const referrals = Route.useLoaderData();
  const awarded = referrals.filter((r) => r.status === "awarded").length;
  const totalCredit = referrals.reduce((sum, r) => sum + r.creditAwarded, 0);

  return (
    <AdminShell
      title="Referrals"
      subtitle={`${awarded} awarded · ${kes(totalCredit)} credit issued`}
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Referrer</th>
                <th className="px-4 py-3 font-medium">Referee</th>
                <th className="px-4 py-3 font-medium">Credit</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {referrals.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleString("en-KE", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                  <td className="max-w-[140px] truncate px-4 py-3 font-mono text-xs">
                    {row.referrerClerkId}
                  </td>
                  <td className="max-w-[140px] truncate px-4 py-3 font-mono text-xs">
                    {row.refereeClerkId}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.creditAwarded > 0 ? kes(row.creditAwarded) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={row.status === "awarded" ? "secondary" : "outline"}
                      className="rounded-full capitalize"
                    >
                      {row.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {referrals.length === 0 && (
          <div className="px-4 py-16 text-center">
            <Gift className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-semibold">No referral events yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Events appear when someone registers with a valid invite code.
            </p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
