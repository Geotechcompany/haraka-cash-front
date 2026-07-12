import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/layout/app-shell";
import {
  ASSESSMENT_STEPS,
  type AssessmentStepResult,
  type AssessmentStepStatus,
} from "@/lib/assessment-steps";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { runAssessment } from "@/server/applications";

const assessmentSearchSchema = z.object({
  applicationId: z.string().optional(),
});

const LOCAL_STEP_MS_MIN = 900;
const LOCAL_STEP_MS_SPAN = 600;
const AI_REVEAL_MS = 380;
const WAITING_TICK_MS = 1_100;

type UiStepState = "idle" | "active" | "done";

function statusLabel(
  status: AssessmentStepStatus | undefined,
  state: UiStepState,
  hasResults: boolean,
) {
  if (state === "active") return "Running…";
  if (state !== "done" || !hasResults) return null;
  if (status === "failed") return "Flagged";
  if (status === "review") return "Review";
  return "Passed";
}

export const Route = createFileRoute("/assessment")({
  validateSearch: assessmentSearchSchema,
  head: () => ({
    meta: [
      { title: "Reviewing your application — HarakaCash" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AssessmentPage,
});

function AssessmentPage() {
  const { applicationId } = Route.useSearch();
  const [current, setCurrent] = useState(0);
  const [stepResults, setStepResults] = useState<AssessmentStepResult[] | null>(null);
  const [finishing, setFinishing] = useState(false);
  const navigate = useNavigate();
  const runAssessmentFn = useServerFn(runAssessment);
  const startedRef = useRef(false);
  const waitingStepRef = useRef(0);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    let waitingTimer: ReturnType<typeof setTimeout> | undefined;
    let revealTimer: ReturnType<typeof setTimeout> | undefined;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        revealTimer = setTimeout(resolve, ms);
      });

    const clearWaiting = () => {
      if (waitingTimer) clearTimeout(waitingTimer);
      waitingTimer = undefined;
    };

    const goToDecision = () => {
      if (cancelled) return;
      navigate({ to: "/decision", search: { applicationId } });
    };

    const runLocalTimedReveal = async (fromStep: number) => {
      let step = fromStep;
      while (step < ASSESSMENT_STEPS.length && !cancelled) {
        setCurrent(step);
        waitingStepRef.current = step;
        await sleep(LOCAL_STEP_MS_MIN + Math.random() * LOCAL_STEP_MS_SPAN);
        step += 1;
      }
      if (cancelled) return;
      setCurrent(ASSESSMENT_STEPS.length);
      setFinishing(true);
      goToDecision();
    };

    const runAiReveal = async (steps: AssessmentStepResult[], fromStep: number) => {
      setStepResults(steps);
      let step = fromStep;
      while (step < ASSESSMENT_STEPS.length && !cancelled) {
        setCurrent(step);
        waitingStepRef.current = step;
        await sleep(AI_REVEAL_MS);
        step += 1;
      }
      if (cancelled) return;
      setCurrent(ASSESSMENT_STEPS.length);
      setFinishing(true);
      await sleep(280);
      goToDecision();
    };

    const tickWhileWaiting = () => {
      waitingTimer = setTimeout(() => {
        if (cancelled) return;
        const next = Math.min(waitingStepRef.current + 1, ASSESSMENT_STEPS.length - 2);
        waitingStepRef.current = next;
        setCurrent(next);
        tickWhileWaiting();
      }, WAITING_TICK_MS);
    };

    const run = async () => {
      if (!applicationId) {
        await runLocalTimedReveal(0);
        return;
      }

      tickWhileWaiting();

      try {
        const result = await runAssessmentFn({ data: applicationId });
        if (cancelled) return;
        clearWaiting();

        const fromStep = waitingStepRef.current;

        if (result.source !== "local" && result.steps?.length) {
          await runAiReveal(result.steps, fromStep);
        } else {
          if (result.steps?.length) setStepResults(result.steps);
          await runLocalTimedReveal(fromStep);
        }
      } catch {
        if (cancelled) return;
        clearWaiting();
        await runLocalTimedReveal(waitingStepRef.current);
      }
    };

    void run();

    return () => {
      cancelled = true;
      clearWaiting();
      if (revealTimer) clearTimeout(revealTimer);
    };
  }, [applicationId, navigate, runAssessmentFn]);

  const progress = Math.min(100, (current / ASSESSMENT_STEPS.length) * 100);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto h-16 w-16 rounded-2xl gradient-brand grid place-items-center text-white shadow-elevated"
          >
            <ShieldCheck className="h-8 w-8" />
          </motion.div>
          <h1 className="mt-6 text-2xl md:text-3xl font-bold tracking-tight">
            Reviewing your application
          </h1>
          <p className="mt-2 text-muted-foreground">
            This takes about 10–15 seconds. Please don't refresh.
          </p>
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
              const state: UiStepState =
                i < current ? "done" : i === current && !finishing ? "active" : "idle";
              const resultStatus = stepResults?.[i]?.status;
              const trailing = statusLabel(resultStatus, state, Boolean(stepResults));

              return (
                <motion.li
                  key={label}
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: state === "idle" ? 0.4 : 1 }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 border",
                    state === "active" && "bg-primary-soft border-primary/30",
                    state === "done" && "border-transparent",
                    state === "idle" && "border-transparent",
                  )}
                >
                  <span
                    className={cn(
                      "h-8 w-8 rounded-full grid place-items-center shrink-0",
                      state === "done" &&
                        resultStatus === "failed" &&
                        "bg-warning text-white",
                      state === "done" &&
                        resultStatus === "review" &&
                        "bg-muted text-foreground",
                      state === "done" &&
                        (!resultStatus || resultStatus === "passed") &&
                        "bg-success text-white",
                      state === "active" && "gradient-brand text-white",
                      state === "idle" && "bg-muted text-muted-foreground",
                    )}
                  >
                    {state === "done" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : state === "active" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium truncate",
                      state !== "idle" ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                  {trailing && (
                    <span
                      className={cn(
                        "ml-auto text-xs font-semibold",
                        state === "active" && "text-primary",
                        state === "done" && resultStatus === "failed" && "text-warning",
                        state === "done" && resultStatus === "review" && "text-muted-foreground",
                        state === "done" &&
                          (!resultStatus || resultStatus === "passed") &&
                          "text-success",
                      )}
                    >
                      {trailing}
                    </span>
                  )}
                </motion.li>
              );
            })}
          </ul>

          <p className="mt-6 text-xs text-muted-foreground text-center">
            This is an initial eligibility review. After you accept and pay the processing fee, our
            team runs CRB (credit bureau) checks before disbursement.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
