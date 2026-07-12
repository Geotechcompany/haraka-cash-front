import { Link, useRouterState } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { to: "/dashboard", label: "Home" },
  { to: "/loans", label: "Loans" },
  { to: "/apply", label: "Apply" },
  { to: "/notifications", label: "Alerts" },
  { to: "/profile", label: "Profile" },
] as const;

export function AppTopbar() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-30 glass border-b border-border/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Logo to="/dashboard" height={40} className="max-w-[180px] sm:max-w-[200px]" />
        <nav className="ml-4 hidden items-center gap-0.5 md:flex" aria-label="Primary">
          {links.map((link) => {
            const active = path === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-[color,background-color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97]",
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-0.5">
          <Button variant="ghost" size="icon" aria-label="Notifications" asChild>
            <Link to="/notifications">
              <Bell className="h-[18px] w-[18px]" />
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
