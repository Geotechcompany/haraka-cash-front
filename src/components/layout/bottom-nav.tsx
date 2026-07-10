import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Wallet, PlusCircle, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/loans", label: "Loans", icon: Wallet },
  { to: "/apply", label: "Apply", icon: PlusCircle, primary: true },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden glass border-t"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5 max-w-md mx-auto px-2 pt-2 pb-2">
        {items.map((it) => {
          const active = path === it.to;
          const Icon = it.icon;
          if (it.primary) {
            return (
              <li key={it.to} className="flex justify-center">
                <Link
                  to={it.to}
                  aria-label={it.label}
                  className="grid place-items-center h-14 w-14 -mt-6 rounded-2xl gradient-brand text-white shadow-elevated hover:scale-105 active:scale-95 transition"
                >
                  <Icon className="h-6 w-6" />
                </Link>
              </li>
            );
          }
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-1.5 text-[11px] font-medium min-h-11",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-[20px] w-[20px]" />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
