import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Menu, Settings } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const links = [
  { to: "/dashboard", label: "Home" },
  { to: "/loans", label: "Loans" },
  { to: "/apply", label: "Apply" },
  { to: "/referrals", label: "Refer" },
  { to: "/notifications", label: "Alerts" },
  { to: "/profile", label: "Profile" },
] as const;

export function AppTopbar() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-30 glass border-b border-border/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Logo to="/dashboard" height={48} className="max-h-9 max-w-[160px] sm:max-h-12 sm:max-w-[220px]" />
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
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Account menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[min(100vw-2rem,20rem)] flex-col">
              <SheetHeader>
                <SheetTitle>Account</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Account">
                {links.map((link) => {
                  const active = path === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={cn(
                        "flex min-h-11 items-center rounded-xl px-3 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary-soft text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                <Link
                  to="/settings"
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors",
                    path === "/settings"
                      ? "bg-primary-soft text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </nav>
              <SignOutButton className="mt-auto w-full justify-start rounded-xl" />
            </SheetContent>
          </Sheet>
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
