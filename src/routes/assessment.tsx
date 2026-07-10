import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ASSESSMENT_STEPS } from "@/lib/mock";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assessment")({
  head: () => ({ meta: [{ title: "Reviewing your application — HarakaCash" }, { name: "robots", content: "noindex" }] }),
  component: AssessmentPage,
});

function AssessmentPage() {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (current >= ASSESSMENT_STEPS.length) {
      const t = setTimeout(() => navigate({ to: "/decision" }), 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCurrent((c) => c + 1), 900 + Math.random() * 600);
    return () => clearTimeout(t);
  }, [current, navigate]);

  const progress = Math.min(100, (current / ASSESSMENT_STEPS.length) * 100);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto h-16 w-16 rounded-2xl gradient-brand grid place-items-center text-white shadow-elevated">
            <ShieldCheck className="h-8 w-8" />
          </motion.div>
          <h1 className="mt-6 text-2xl md:text-3xl font-bold tracking-tight">Reviewing your application</h1>
          <p className="mt-2 text-muted-foreground">This takes about 10–15 seconds. Please don't refresh.</p>
        </div>

        <div className="mt-8 card-soft p-6 md:p-8">
          <div className="mb-6">
            <div className="flex justify-between text-xs font-medium mb-2">
              <span>Assessment progress</span>
              <span className="tabular-nums">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <ul className="space-y-3">
            {ASSESSMENT_STEPS.map((label, i) => {
              const state = i < current ? "done" : i === current ? "active" : "idle";
              return (
                <motion.li
                  key={label}
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: state === "idle" ? 0.4 : 1 }}
                  className={cn("flex items-center gap-3 rounded-xl px-4 py-3 border",
                    state === "active" && "bg-primary-soft border-primary/30",
                    state === "done" && "border-transparent",
                    state === "idle" && "border-transparent")}
                >
                  <span className={cn("h-8 w-8 rounded-full grid place-items-center shrink-0",
                    state === "done" && "bg-success text-white",
                    state === "active" && "gradient-brand text-white",
                    state === "idle" && "bg-muted text-muted-foreground")}>
                    {state === "done" ? <CheckCircle2 className="h-4 w-4" /> : state === "active" ? <Loader2 className="h-4 w-4 animate-spin" /> : i + 1}
                  </span>
                  <span className={cn("text-sm font-medium truncate", state !== "idle" ? "text-foreground" : "text-muted-foreground")}>{label}</span>
                  {state === "active" && <span className="ml-auto text-xs text-primary font-semibold">Running…</span>}
                  {state === "done" && <span className="ml-auto text-xs text-success font-semibold">Passed</span>}
                </motion.li>
              );
            })}
          </ul>

          <p className="mt-6 text-xs text-muted-foreground text-center">
            HarakaCash uses a responsible internal assessment. We do not access official credit bureau systems in this demo.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
