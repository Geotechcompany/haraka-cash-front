import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/layout/admin-shell";
import { LifeBuoy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listSupportTickets } from "@/server/support";

export const Route = createFileRoute("/admin/support")({
  head: () => ({ meta: [{ title: "Support — Admin" }] }),
  loader: () => listSupportTickets(),
  component: AdminSupportPage,
});

function AdminSupportPage() {
  const tickets = Route.useLoaderData();
  return (
    <AdminShell title="Support" subtitle="Live conversations with borrowers.">
      <div className="card-soft divide-y">
        {tickets.map((t) => (
          <div key={t.id} className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary grid place-items-center"><MessageCircle className="h-5 w-5" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{t.subject}</p>
              <p className="text-xs text-muted-foreground truncate">{t.id} · {t.user} · {t.updated}</p>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted">{t.status}</span>
            <Button size="sm" variant="outline" className="rounded-lg">Open</Button>
          </div>
        ))}
        {tickets.length === 0 && (
          <div className="text-center py-20"><LifeBuoy className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-semibold">Inbox zero</p></div>
        )}
      </div>
    </AdminShell>
  );
}
