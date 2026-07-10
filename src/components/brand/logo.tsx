import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({ className, to = "/" }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={cn("flex items-center gap-2 group", className)} aria-label="HarakaCash home">
      <span className="grid h-9 w-9 place-items-center rounded-xl gradient-brand text-white font-bold shadow-soft transition-transform group-hover:scale-105">
        H
      </span>
      <span className="font-semibold text-[17px] tracking-tight">
        Haraka<span className="text-gradient-brand">Cash</span>
      </span>
    </Link>
  );
}
