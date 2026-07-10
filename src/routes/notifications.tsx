import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Bell, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { NOTIFICATIONS } from "@/lib/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — HarakaCash" }] }),
  component: NotificationsPage,
});

const icon = { success: CheckCircle2, warning: AlertTriangle, info: Info };
const tone = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-[color:oklch(0.45_0.15_70)] dark:text-warning",
  info: "bg-primary-soft text-primary",
};

function NotificationsPage() {
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="mt-1 text-muted-foreground">Loan updates, offers and reminders.</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl">Mark all read</Button>
        </div>

        <div className="card-soft divide-y">
          {NOTIFICATIONS.map((n, i) => {
            const Icon = icon[n.type];
            return (
              <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className={cn("p-5 flex gap-4 items-start", n.unread && "bg-primary/[0.02]")}>
                <div className={cn("h-10 w-10 rounded-xl grid place-items-center shrink-0", tone[n.type])}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{n.title}</p>
                    {n.unread && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">{n.time}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {NOTIFICATIONS.length === 0 && (
          <div className="text-center py-20">
            <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-semibold">You're all caught up</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
