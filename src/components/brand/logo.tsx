import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  to = "/",
  height = 48,
  variant,
}: {
  className?: string;
  to?: string;
  height?: number;
  /**
   * `white` — always white (dark brand panels in either theme).
   * `color` — always color.
   * omit — color in light mode, white when `html` has `dark`.
   */
  variant?: "color" | "white";
}) {
  const width = Math.round(height * 3.5);
  const imgClass =
    "w-auto max-w-full object-contain object-left transition-transform group-hover:scale-[1.02]";

  return (
    <Link
      to={to}
      className={cn("inline-flex items-center group", className)}
      aria-label="HarakaCash home"
    >
      {variant === "white" ? (
        <img
          src="/logo-white.png"
          alt="Haraka Cash"
          height={height}
          width={width}
          className={imgClass}
          style={{ height }}
        />
      ) : variant === "color" ? (
        <img
          src="/logo.png"
          alt="Haraka Cash"
          height={height}
          width={width}
          className={imgClass}
          style={{ height }}
        />
      ) : (
        <>
          <img
            src="/logo.png"
            alt="Haraka Cash"
            height={height}
            width={width}
            className={cn(imgClass, "dark:hidden")}
            style={{ height }}
          />
          <img
            src="/logo-white.png"
            alt=""
            aria-hidden
            height={height}
            width={width}
            className={cn(imgClass, "hidden dark:block")}
            style={{ height }}
          />
        </>
      )}
    </Link>
  );
}
