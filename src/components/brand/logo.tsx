import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  to = "/",
  height = 40,
}: {
  className?: string;
  to?: string;
  height?: number;
}) {
  return (
    <Link
      to={to}
      className={cn("inline-flex items-center group", className)}
      aria-label="HarakaCash home"
    >
      <img
        src="/logo.png"
        alt="Haraka Cash"
        height={height}
        className="h-10 w-auto max-w-[180px] object-contain object-left transition-transform group-hover:scale-[1.02]"
        style={{ height }}
      />
    </Link>
  );
}
