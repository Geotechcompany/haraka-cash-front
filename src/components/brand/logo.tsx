import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  to = "/",
  height = 48,
  variant = "color",
}: {
  className?: string;
  to?: string;
  height?: number;
  /** `white` for dark / brand-gradient surfaces */
  variant?: "color" | "white";
}) {
  const src = variant === "white" ? "/logo-white.png" : "/logo.png";

  return (
    <Link
      to={to}
      className={cn("inline-flex items-center group", className)}
      aria-label="HarakaCash home"
    >
      <img
        src={src}
        alt="Haraka Cash"
        height={height}
        width={Math.round(height * 3.5)}
        className="w-auto max-w-full object-contain object-left transition-transform group-hover:scale-[1.02]"
        style={{ height }}
      />
    </Link>
  );
}
