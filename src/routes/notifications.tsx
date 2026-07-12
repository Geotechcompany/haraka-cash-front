import { createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { Bell, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listNotifications, markAllNotificationsRead } from "@/server/notifications";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — HarakaCash" }] }),
  loader: () => listNotifications(),
  component: NotificationsPage,
});

const icon = { success: CheckCircle2, warning: AlertTriangle, info: Info };
const tone = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-[color:oklch(0.45_0.15_70)] dark:text-warning",
  info: "bg-primary-soft text-primary",
};

const springEnter = { type: "spring" as const, bounce: 0, duration: 0.35 };
const STAGGER = 0.045;

function NotificationsPage() {
  const notifications = Route.useLoaderData();
  const markRead = useServerFn(markAllNotificationsRead);
  const reduceMotion = useReducedMotion();
  const unread = notifications.filter((n) => n.unread).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Alerts</h1>
            <p className="mt-1 text-muted-foreground">
              {unread > 0
                ? `${unread} unread · loan updates and reminders`
                : "Loan updates and reminders"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => markRead()}
            disabled={unread === 0}
          >
            Mark all read
          </Button>
        </div>

        {notifications.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-20 text-center shadow-soft">
            <Bell className="mx-auto h-9 w-9 text-muted-foreground" />
            <p className="mt-3 font-semibold">You're all caught up</p>
            <p className="mt-1 text-sm text-muted-foreground">New loan updates will show here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            {notifications.map((n, i) => {
              const Icon = icon[n.type];
              return (
                <motion.div
                  key={n.id}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  transition={
                    reduceMotion
                      ? { duration: 0.15, delay: i * STAGGER }
                      : { ...springEnter, delay: i * STAGGER }
                  }
                  className={cn(
                    "flex items-start gap-4 p-5 transition-colors duration-150 ease-[var(--ease-out)]",
                    n.unread && "bg-primary/[0.03]",
                  )}
                >
                  <div
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                      tone[n.type],
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{n.title}</p>
                      {n.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">{n.time}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
