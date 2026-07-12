import type { ReactNode } from "react";
import { AppTopbar } from "./app-topbar";
import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <AppTopbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 md:py-8 pb-28 md:pb-16">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
