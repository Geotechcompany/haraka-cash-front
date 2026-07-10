import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRight, Zap, ShieldCheck, Gauge, Wallet, Sparkles, CheckCircle2,
  Smartphone, Lock, Clock, TrendingUp, Star,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { kes } from "@/lib/loan";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HarakaCash — Fast Digital Loans for Every Kenyan" },
      { name: "description", content: "Apply for instant digital loans in minutes. Transparent fees, fast decisions, secure disbursement to M-Pesa." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Zap, title: "Instant Application", body: "Complete your loan request in under 3 minutes on any device." },
  { icon: Gauge, title: "Automated Review", body: "Decisions in seconds using a responsible affordability engine." },
  { icon: ShieldCheck, title: "Secure Verification", body: "Bank-grade encryption and ID checks protect every application." },
  { icon: Wallet, title: "Transparent Fees", body: "Know the processing fee and total payable before you accept." },
  { icon: Smartphone, title: "Fast Disbursement", body: "Funds sent straight to your M-Pesa or bank account." },
  { icon: Lock, title: "Data Privacy", body: "Your information is never shared without your consent." },
];

const steps = [
  "Create Account",
  "Verify Details",
  "Apply for a Loan",
  "Automated Assessment",
  "Instant Decision",
  "Accept the Offer",
  "Ready for Disbursement",
];

const faqs = [
  { q: "How much can I borrow?", a: "First-time borrowers can access up to KES 20,000. Your limit grows to KES 250,000 as you build a repayment history with HarakaCash." },
  { q: "How fast is disbursement?", a: "Approved loans are disbursed to M-Pesa or your bank within 5 minutes of you accepting the offer." },
  { q: "What are the fees?", a: "A one-time processing fee is shown transparently before you accept. Fees range from KES 150 for a KES 5,000 loan to KES 2,000 for a KES 100,000 loan." },
  { q: "Do you contact a credit bureau?", a: "HarakaCash runs a responsible internal affordability and eligibility assessment. We do not claim live access to any regulated credit bureau in this demo." },
  { q: "What happens if I repay late?", a: "A late fee applies and it can affect your future eligibility. We send reminders in advance to help you stay on track." },
];

function Landing() {
  return (
    <div className="min-h-dvh bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-30 glass">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Logo />
          <nav className="hidden md:flex items-center gap-1 ml-8 text-sm">
            <a href="#features" className="px-3 py-2 text-muted-foreground hover:text-foreground rounded-lg">Features</a>
            <a href="#how" className="px-3 py-2 text-muted-foreground hover:text-foreground rounded-lg">How it works</a>
            <a href="#fees" className="px-3 py-2 text-muted-foreground hover:text-foreground rounded-lg">Fees</a>
            <a href="#faq" className="px-3 py-2 text-muted-foreground hover:text-foreground rounded-lg">FAQ</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild className="hidden sm:inline-flex"><Link to="/login">Sign in</Link></Button>
            <Button asChild className="rounded-xl gradient-brand text-white shadow-soft"><Link to="/register">Get started</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full gradient-brand opacity-20 blur-3xl" aria-hidden />
        <div className="absolute top-40 -left-40 h-[420px] w-[420px] rounded-full bg-secondary-foreground/10 blur-3xl" aria-hidden />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 md:pt-24 md:pb-32 grid lg:grid-cols-2 gap-12 items-center relative">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Trusted by 120,000+ Kenyans
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              Fast digital loans<br />
              for every <span className="text-gradient-brand">Kenyan.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-lg">
              Apply in minutes. Receive instant decisions. Transparent processing fees.
              Direct to your M-Pesa or bank account.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-xl gradient-brand text-white h-12 px-6 text-base shadow-soft">
                <Link to="/register">Apply now <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-xl h-12 px-6 text-base">
                <a href="#how">Learn more</a>
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> No paperwork</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> M-Pesa payout</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> 24/7 support</div>
            </div>
          </motion.div>

          {/* Hero visual: phone mock */}
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }} className="relative">
            <div className="relative mx-auto w-full max-w-sm">
              <div className="absolute -inset-6 gradient-brand opacity-20 blur-3xl rounded-[3rem]" aria-hidden />
              <div className="relative rounded-[2.5rem] border-8 border-foreground/90 bg-card shadow-elevated overflow-hidden aspect-[9/19]">
                <div className="p-5 h-full flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Good morning</span>
                    <span className="h-8 w-8 rounded-full gradient-brand grid place-items-center text-white text-xs font-semibold">WM</span>
                  </div>
                  <div className="rounded-2xl gradient-brand p-4 text-white shadow-soft">
                    <p className="text-[11px] uppercase tracking-wide opacity-80">Available credit</p>
                    <p className="mt-1 text-3xl font-bold tabular-nums">{kes(45000)}</p>
                    <div className="mt-3 h-1.5 rounded-full bg-white/25 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: "72%" }} transition={{ delay: 0.6, duration: 1 }} className="h-full bg-white" />
                    </div>
                    <p className="mt-2 text-xs opacity-80">Eligibility score · 72 / 100</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { l: "Active loan", v: kes(15000) },
                      { l: "Due in", v: "12 days" },
                      { l: "Repaid", v: kes(9000) },
                      { l: "Fee", v: kes(250) },
                    ].map((c) => (
                      <div key={c.l} className="rounded-xl border p-3">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.l}</p>
                        <p className="text-sm font-semibold mt-0.5">{c.v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto rounded-2xl border p-3 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-success/15 grid place-items-center">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">Loan approved</p>
                      <p className="text-[11px] text-muted-foreground truncate">Sent to M-Pesa · just now</p>
                    </div>
                  </div>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 }}
                className="absolute -left-6 top-16 hidden sm:flex items-center gap-2 rounded-2xl bg-card border shadow-soft px-3 py-2"
              >
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">Approved in 12s</span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.1 }}
                className="absolute -right-4 bottom-24 hidden sm:flex items-center gap-2 rounded-2xl bg-card border shadow-soft px-3 py-2"
              >
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-xs font-medium">Limit up 20%</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">Why HarakaCash</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">Built for speed. Designed for trust.</h2>
          <p className="mt-3 text-muted-foreground">Everything you need to borrow responsibly, in one clean experience.</p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="card-soft p-6 hover:shadow-elevated transition-shadow"
            >
              <div className="h-11 w-11 rounded-xl bg-primary-soft text-primary grid place-items-center">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-muted/40 border-y">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">How it works</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">From apply to payout in minutes.</h2>
          </div>
          <ol className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((s, i) => (
              <motion.li key={s}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="card-soft p-5 flex items-start gap-4"
              >
                <span className="h-9 w-9 shrink-0 rounded-xl gradient-brand text-white grid place-items-center text-sm font-bold">{i + 1}</span>
                <div className="min-w-0">
                  <p className="font-semibold">{s}</p>
                  <p className="text-xs text-muted-foreground mt-1">Step {i + 1} of {steps.length}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* Fees */}
      <section id="fees" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <p className="text-sm font-semibold text-primary">Transparent pricing</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">One-time processing fee. No surprises.</h2>
            <p className="mt-3 text-muted-foreground">You'll see the full breakdown — principal, interest and processing fee — before you accept any offer.</p>
            <Button asChild className="mt-6 rounded-xl gradient-brand text-white"><Link to="/register">Start your application</Link></Button>
          </div>
          <div className="card-soft overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Loan amount</th>
                  <th className="text-right font-medium px-5 py-3">Processing fee</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[[5000, 150], [10000, 250], [20000, 500], [50000, 1000], [100000, 2000]].map(([a, f]) => (
                  <tr key={a} className="tabular-nums">
                    <td className="px-5 py-4 font-medium">{kes(a)}</td>
                    <td className="px-5 py-4 text-right">{kes(f)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-muted/40 border-y">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">Loved across Kenya</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">Trusted by Kenyans, from Kisumu to Mombasa.</h2>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {[
              { n: "Wanjiru M.", t: "Nairobi", q: "Got KES 25,000 for stock in under 5 minutes. Fees were exactly what they said." },
              { n: "Otieno K.", t: "Kisumu", q: "The app is so clean. I love that I see the total payable before accepting." },
              { n: "Achieng W.", t: "Mombasa", q: "HarakaCash saved me when school fees were due. Repayment was smooth." },
            ].map((r) => (
              <div key={r.n} className="card-soft p-6">
                <div className="flex gap-0.5 text-warning">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
                <p className="mt-3 text-sm">"{r.q}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full gradient-brand text-white grid place-items-center text-sm font-semibold">{r.n[0]}</div>
                  <div>
                    <p className="text-sm font-semibold">{r.n}</p>
                    <p className="text-xs text-muted-foreground">{r.t}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <p className="text-sm font-semibold text-primary">FAQ</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">Questions, answered.</h2>
        </div>
        <Accordion type="single" collapsible className="mt-10">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`i${i}`} className="border-b">
              <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-3xl gradient-brand p-10 md:p-14 text-white shadow-elevated relative overflow-hidden">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden />
          <h2 className="text-3xl md:text-4xl font-bold max-w-xl leading-tight">Your next loan is a few taps away.</h2>
          <p className="mt-3 max-w-lg opacity-90">Join thousands of Kenyans borrowing responsibly with HarakaCash.</p>
          <Button asChild size="lg" variant="secondary" className="mt-6 rounded-xl h-12 px-6 text-base">
            <Link to="/register">Create free account <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid gap-8 md:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground max-w-xs">Fast, transparent digital loans built for Kenya.</p>
          </div>
          {[
            { h: "Product", l: [["Apply", "/register"], ["Dashboard", "/dashboard"], ["Pricing", "#fees"]] },
            { h: "Company", l: [["About", "#"], ["Careers", "#"], ["Contact", "/support"]] },
            { h: "Legal", l: [["Terms", "#"], ["Privacy", "#"], ["Compliance", "#"]] },
          ].map((c) => (
            <div key={c.h}>
              <p className="text-sm font-semibold">{c.h}</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {c.l.map(([label, href]) => (
                  <li key={label}><a href={href} className="hover:text-foreground">{label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} HarakaCash. All rights reserved.</p>
            <p>Loans subject to eligibility. Terms apply.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
