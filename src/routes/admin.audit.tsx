import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/layout/admin-shell";
import { ScrollText } from "lucide-react";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Audit logs — Admin" }] }),
  component: () => {
    const logs = Array.from({ length: 14 }).map((_, i) => ({
      id: i,
      actor: ["admin@haraka.co", "system", "credit-engine", "operator@haraka.co"][i % 4],
      action: ["Approved loan", "Declined application", "Updated rule", "Manual review", "Disbursed funds"][i % 5],
      target: `HC-${10240 + i}`,
      time: `${i + 1}m ago`,
    }));
    return (
      <AdminShell title="Audit logs" subtitle="Every action on the platform, immutable and traceable.">
        <div className="card-soft divide-y">
          {logs.map((l) => (
            <div key={l.id} className="p-4 flex items-center gap-4">
              <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center"><ScrollText className="h-4 w-4" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm"><span className="font-semibold">{l.actor}</span> <span className="text-muted-foreground">{l.action.toLowerCase()}</span> <span className="font-mono text-xs">{l.target}</span></p>
                <p className="text-xs text-muted-foreground">{l.time}</p>
              </div>
            </div>
          ))}
        </div>
      </AdminShell>
    );
  },
});
