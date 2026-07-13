import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";

export function BlogPageShell({
  title,
  subtitle,
  meta,
  children,
}: {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background font-sans">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-4 px-4 sm:px-6">
          <Logo height={48} className="max-h-10 max-w-[180px] sm:max-h-12 sm:max-w-[220px]" />
          <nav className="ml-4 hidden items-center gap-1 text-sm sm:flex" aria-label="Primary">
            <Link
              to="/blog"
              className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              Blog
            </Link>
            <Link
              to="/apply"
              className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              Apply
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Blog</p>
        <h1 className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle ? (
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{subtitle}</p>
        ) : null}
        {meta ? <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">{meta}</div> : null}
        {children}
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <p>© {new Date().getFullYear()} HarakaCash. Nairobi, Kenya.</p>
          <nav className="flex gap-4" aria-label="Footer">
            <Link to="/blog" className="hover:text-foreground">
              Blog
            </Link>
            <Link to="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link to="/apply" className="hover:text-foreground">
              Apply
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
