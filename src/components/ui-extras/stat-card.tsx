import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const springEnter = { type: "spring" as const, bounce: 0, duration: 0.35 };

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  delay = 0,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "primary";
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const toneMap = {
    default: "bg-muted text-foreground",
    primary: "bg-primary-soft text-primary",
    success:
      "bg-[color:oklch(0.95_0.08_148)] text-[color:oklch(0.4_0.15_148)] dark:bg-[color:oklch(0.28_0.08_148)] dark:text-[color:oklch(0.85_0.15_148)]",
    warning:
      "bg-[color:oklch(0.96_0.09_70)] text-[color:oklch(0.45_0.15_70)] dark:bg-[color:oklch(0.3_0.09_70)] dark:text-[color:oklch(0.85_0.15_70)]",
    danger:
      "bg-[color:oklch(0.95_0.07_27)] text-[color:oklch(0.5_0.2_27)] dark:bg-[color:oklch(0.3_0.09_27)] dark:text-[color:oklch(0.85_0.15_27)]",
  };

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0.2, delay } : { ...springEnter, delay }}
      className="card-soft flex items-start gap-4 p-5"
    >
      {Icon && (
        <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", toneMap[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="mt-1 truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </motion.div>
  );
}
