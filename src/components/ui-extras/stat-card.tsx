import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, hint, icon: Icon, tone = "default", delay = 0,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "primary";
  delay?: number;
}) {
  const toneMap = {
    default: "bg-muted text-foreground",
    primary: "bg-primary-soft text-primary",
    success: "bg-[color:oklch(0.95_0.08_148)] text-[color:oklch(0.4_0.15_148)] dark:bg-[color:oklch(0.28_0.08_148)] dark:text-[color:oklch(0.85_0.15_148)]",
    warning: "bg-[color:oklch(0.96_0.09_70)] text-[color:oklch(0.45_0.15_70)] dark:bg-[color:oklch(0.3_0.09_70)] dark:text-[color:oklch(0.85_0.15_70)]",
    danger: "bg-[color:oklch(0.95_0.07_27)] text-[color:oklch(0.5_0.2_27)] dark:bg-[color:oklch(0.3_0.09_27)] dark:text-[color:oklch(0.85_0.15_27)]",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="card-soft p-5 flex items-start gap-4"
    >
      {Icon && (
        <div className={cn("h-11 w-11 rounded-xl grid place-items-center shrink-0", toneMap[tone])}>
          <Icon className="h-[20px] w-[20px]" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-semibold mt-1 tabular-nums truncate">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1 truncate">{hint}</p>}
      </div>
    </motion.div>
  );
}
