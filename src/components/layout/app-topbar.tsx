import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Search } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/loans", label: "Loans" },
  { to: "/apply", label: "Apply" },
  { to: "/notifications", label: "Notifications" },
  { to: "/profile", label: "Profile" },
];

export function AppTopbar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <header className="sticky top-0 z-30 glass">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
        <Logo />
        <nav className="hidden md:flex items-center gap-1 ml-6" aria-label="Primary">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                path === l.to ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Search" className="hidden sm:inline-flex">
            <Search className="h-[18px] w-[18px]" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Notifications" asChild>
            <Link to="/notifications"><Bell className="h-[18px] w-[18px]" /></Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
