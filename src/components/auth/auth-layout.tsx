import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";

export function AuthLayout({
  title, subtitle, children, footer,
}: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-background">
      <div className="relative hidden lg:flex flex-col justify-between p-10 gradient-brand text-white overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-black/10 blur-3xl" aria-hidden />
        <Logo />
        <div className="relative max-w-md">
          <p className="text-3xl font-bold leading-tight">"HarakaCash gave me the working capital I needed within 5 minutes."</p>
          <p className="mt-4 text-sm opacity-80">— Small business owner, Nairobi</p>
        </div>
        <div className="relative text-xs opacity-70">© HarakaCash · Nairobi, Kenya</div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center justify-between p-4 lg:p-6">
          <div className="lg:hidden"><Logo /></div>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-6 text-sm text-foreground/70">{footer}</div>}
            <p className="mt-10 text-xs text-foreground/60">
              By continuing you agree to our <Link to="/" className="underline">Terms</Link> and <Link to="/" className="underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
