import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, Users, Banknote, CreditCard,
  BarChart3, Settings, LifeBuoy, ScrollText, PieChart,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { cn } from "@/lib/utils";

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/applications", label: "Applications", icon: FileText },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/loans", label: "Loans", icon: Banknote },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/analytics", label: "Analytics", icon: PieChart },
  { to: "/admin/audit", label: "Audit Logs", icon: ScrollText },
  { to: "/admin/support", label: "Support", icon: LifeBuoy },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export function AdminShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-dvh bg-muted/40">
      <aside className="fixed inset-y-0 left-0 w-64 border-r bg-sidebar text-sidebar-foreground hidden lg:flex flex-col">
        <div className="h-16 px-5 flex items-center border-b border-sidebar-border">
          <Logo to="/admin" />
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto" aria-label="Admin">
          {items.map((it) => {
            const active = it.exact ? path === it.to : path.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{it.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border text-xs text-muted-foreground">
          HarakaCash Admin · v1.0
        </div>
      </aside>

      <div className="lg:pl-64 flex flex-col min-h-dvh">
        <header className="sticky top-0 z-20 h-16 bg-card border-b flex items-center gap-4 px-4 sm:px-8">
          <div className="lg:hidden">
            <Logo to="/admin" />
          </div>
          <div className="hidden lg:block min-w-0">
            <h1 className="text-lg font-semibold truncate">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <div className="h-9 w-9 rounded-full gradient-brand text-white grid place-items-center text-sm font-semibold">A</div>
          </div>
        </header>
        <div className="lg:hidden px-4 pt-4">
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
