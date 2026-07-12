import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Wallet, PlusCircle, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof Home; primary?: boolean };

const items: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/loans", label: "Loans", icon: Wallet },
  { to: "/apply", label: "Apply", icon: PlusCircle, primary: true },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 glass md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 px-2 pb-2 pt-1.5">
        {items.map((item) => {
          const active = path === item.to;
          const Icon = item.icon;

          if (item.primary) {
            return (
              <li key={item.to} className="flex justify-center">
                <Link
                  to={item.to}
                  aria-label={item.label}
                  className="grid h-14 w-14 -mt-5 place-items-center rounded-2xl gradient-brand text-white shadow-elevated transition-[transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97]"
                >
                  <Icon className="h-6 w-6" />
                </Link>
              </li>
            );
          }

          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "flex min-h-11 flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium transition-[color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.25]")} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
