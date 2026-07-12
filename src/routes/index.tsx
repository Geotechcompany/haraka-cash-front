import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@clerk/tanstack-react-start";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Gift, LayoutDashboard, Wallet, Banknote } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { kes } from "@/lib/loan";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HarakaCash — M-Pesa Loans & Salary Advance Kenya" },
      {
        name: "description",
        content:
          "Personal loans and salary advances to M-Pesa. Clear fees, one-month terms, instant decisions. Built for Kenya.",
      },
      { property: "og:title", content: "HarakaCash — M-Pesa Loans & Salary Advance Kenya" },
      {
        property: "og:description",
        content: "Borrow to M-Pesa or advance against your next salary. Clear fees. Fast decisions.",
      },
      { property: "og:image", content: "/logo.png" },
    ],
  }),
  component: Landing,
});

const steps = [
  { title: "Apply", body: "Tell us how much you need and for how long." },
  { title: "Decide", body: "We check affordability and return an offer on the spot." },
  { title: "Get paid", body: "Pay the fee, then our team clears CRB checks before M-Pesa payout." },
];

const faqs = [
  {
    q: "How much can I borrow?",
    a: "First loans go up to KES 20,000. Limits climb toward KES 250,000 as you repay on time.",
  },
  {
    q: "What is a salary advance?",
    a: "A short-term advance against your next pay cheque. You borrow now, repay in one month when salary lands on M-Pesa.",
  },
  {
    q: "How fast is disbursement?",
    a: "After you pay the processing fee, our team runs CRB checks. Once cleared, funds go to M-Pesa.",
  },
  {
    q: "What are the fees?",
    a: "You pay one processing fee, shown on your offer before you accept. Principal and interest are listed there too. Nothing else is added at payout.",
  },
  {
    q: "Do you pull a credit bureau file?",
    a: "Yes. After you accept and pay the processing fee, our team runs CRB (credit bureau) checks before disbursement.",
  },
  {
    q: "Can I raise my limit by inviting friends?",
    a: "Yes. Share your referral link from the app. When someone creates an account with it, your available credit goes up by KES 1,000 (up to 10 people).",
  },
  {
    q: "What if I repay late?",
    a: "A late fee applies and future limits can shrink. We send reminders before the due date.",
  },
];

const springEnter = { type: "spring" as const, bounce: 0, duration: 0.45 };
const springSoft = { type: "spring" as const, bounce: 0, duration: 0.55 };

function Landing() {
  const reduceMotion = useReducedMotion();
  const { isSignedIn } = useAuth();

  return (
    <div className="min-h-dvh bg-background font-sans">
      <header className="sticky top-0 z-30 glass border-b border-white/10">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Logo height={64} className="max-h-11 max-w-[200px] sm:max-h-16 sm:max-w-[280px]" />
          <nav className="ml-8 hidden items-center gap-1 text-sm md:flex" aria-label="Primary">
            <a href="#products" className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-foreground">
              Products
            </a>
            <a href="#how" className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#faq" className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {isSignedIn ? (
              <>
                <Button variant="ghost" size="sm" className="gap-1.5 px-2.5" asChild>
                  <Link to="/referrals">
                    <Gift className="h-[18px] w-[18px]" aria-hidden />
                    <span className="text-sm font-medium">Invite</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" aria-label="Dashboard" asChild>
                  <Link to="/dashboard">
                    <LayoutDashboard className="h-[18px] w-[18px]" />
                  </Link>
                </Button>
                <Button asChild className="rounded-xl gradient-brand text-white shadow-soft">
                  <Link to="/apply">Apply</Link>
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild className="hidden sm:inline-flex">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild className="rounded-xl gradient-brand text-white shadow-soft">
                  <Link to="/register">Apply</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* One composition: brand + headline + line + CTAs + full-bleed photo plane */}
      <section className="relative min-h-[min(92dvh,920px)] overflow-hidden landing-hero-photo text-white">
        <div className="relative mx-auto grid min-h-[min(92dvh,920px)] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-0 lg:px-8 lg:py-24">
          <motion.div
            className="relative z-10 max-w-xl"
            initial={reduceMotion ? false : { y: 18 }}
            animate={{ y: 0 }}
            transition={springEnter}
          >
            <h1 className="font-display text-[clamp(2.4rem,6vw,4.25rem)] font-extrabold leading-[1.02] tracking-[-0.03em]">
              Cash on M-Pesa
              <br />
              before lunch.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/85 sm:text-lg">
              Apply in minutes. See your offer upfront. Get paid when you confirm on your phone.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-xl bg-white px-6 text-base font-semibold text-[oklch(0.35_0.16_258)] shadow-elevated hover:bg-white/95"
              >
                <Link to="/register">
                  Start application <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-white/35 bg-white/5 px-6 text-base text-white backdrop-blur-sm hover:bg-white/10 hover:text-white"
              >
                <a href="#how">See how it works</a>
              </Button>
            </div>
          </motion.div>

          <motion.div
            className="relative mx-auto flex w-full max-w-[320px] items-center justify-center lg:ml-auto lg:mr-2 lg:max-w-[340px]"
            initial={reduceMotion ? false : { y: 20 }}
            animate={{ y: 0 }}
            transition={springSoft}
            aria-hidden
          >
            {/* Phone shell */}
            <div className="relative w-full aspect-[9/19.2] rounded-[2.6rem] bg-[#0b0d12] p-[10px] shadow-[0_40px_80px_-24px_rgba(0,0,0,0.55)] ring-1 ring-black/40">
              <div className="absolute inset-[3px] rounded-[2.35rem] bg-gradient-to-b from-white/15 to-transparent opacity-40 pointer-events-none" />
              <div className="relative flex h-full flex-col overflow-hidden rounded-[2.15rem] bg-[#f4f6fb] text-[oklch(0.2_0.03_264)]">
                {/* Status bar */}
                <div className="relative z-10 flex items-center justify-between px-6 pt-3.5 text-[11px] font-semibold tracking-tight text-foreground">
                  <span className="tabular-nums">9:41</span>
                  <div className="absolute left-1/2 top-2.5 h-[22px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-3.5 rounded-[2px] border border-foreground/80">
                      <span className="ml-[1px] mt-[1px] block h-[5px] w-2 rounded-[1px] bg-foreground/80" />
                    </span>
                  </div>
                </div>

                {/* App screen */}
                <div className="flex flex-1 flex-col px-4 pb-3 pt-4">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Today
                    </p>
                    <img
                      src="/favicon-mark.png"
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 rounded-full object-cover ring-1 ring-black/5"
                    />
                  </div>

                  <div className="mt-4 flex-1 rounded-[1.35rem] bg-white p-5 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.35)]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Available credit
                    </p>
                    <motion.p
                      className="mt-2 font-display text-[2rem] font-bold leading-none tracking-tight tabular-nums text-foreground"
                      initial={reduceMotion ? false : { y: 8 }}
                      animate={{ y: 0 }}
                      transition={{ ...springSoft, delay: reduceMotion ? 0 : 0.12 }}
                    >
                      {kes(45000)}
                    </motion.p>
                    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full origin-left rounded-full gradient-brand"
                        initial={reduceMotion ? { scaleX: 0.72 } : { scaleX: 0.08 }}
                        animate={{ scaleX: 0.72 }}
                        transition={{ ...springSoft, delay: reduceMotion ? 0 : 0.25 }}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">Eligibility 72 / 100</p>

                    <div className="mt-6 space-y-3.5 border-t border-border/80 pt-5">
                      <div className="flex justify-between text-[13px]">
                        <span className="text-muted-foreground">Active loan</span>
                        <span className="font-semibold tabular-nums">{kes(15000)}</span>
                      </div>
                      <div className="flex justify-between text-[13px]">
                        <span className="text-muted-foreground">Due in</span>
                        <span className="font-semibold">12 days</span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 px-2 text-center text-[10px] leading-snug text-muted-foreground">
                    Funds sent straight to your M-Pesa
                  </p>

                  {/* Home indicator */}
                  <div className="mx-auto mt-auto mb-1 h-1 w-[34%] rounded-full bg-foreground/25" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="products" className="border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <motion.div
            initial={reduceMotion ? false : { y: 12 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={springEnter}
            className="max-w-2xl"
          >
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Two ways to borrow
            </h2>
            <p className="mt-3 text-muted-foreground">
              Pick what fits today. Both pay out to M-Pesa after approval and CRB clearance.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <motion.article
              initial={reduceMotion ? false : { y: 14 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={springEnter}
              className="card-soft flex flex-col p-6 md:p-8"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-brand text-white">
                <Wallet className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Personal loan</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                For stock, school fees, rent, or emergencies. One-month term with fees shown before
                you accept.
              </p>
              <Button asChild className="mt-6 w-fit rounded-xl gradient-brand text-white shadow-soft">
                <Link to="/apply" search={{ product: "personal-loan" }}>
                  Apply for a loan <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </motion.article>

            <motion.article
              initial={reduceMotion ? false : { y: 14 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ ...springEnter, delay: reduceMotion ? 0 : 0.06 }}
              className="card-soft flex flex-col p-6 md:p-8"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Banknote className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Salary advance</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                Bridge to pay day. Borrow against your next salary, repay in one month when M-Pesa
                credit hits.
              </p>
              <Button asChild variant="outline" className="mt-6 w-fit rounded-xl">
                <Link to="/apply" search={{ product: "salary-advance" }}>
                  Apply for salary advance <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </motion.article>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <motion.div
          initial={reduceMotion ? false : { y: 12 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={springEnter}
          className="max-w-2xl"
        >
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Three steps. No paperwork pile.
          </h2>
          <p className="mt-3 text-muted-foreground">
            From application to M-Pesa credit in one sitting.
          </p>
        </motion.div>

        <ol className="mt-14 grid gap-10 sm:grid-cols-3 lg:gap-8">
          {steps.map((step, index) => (
            <motion.li
              key={step.title}
              initial={reduceMotion ? false : { y: 14 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ ...springEnter, delay: reduceMotion ? 0 : index * 0.05 }}
              className="relative"
            >
              <p className="font-display text-5xl font-extrabold tracking-tight text-primary/20 tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </motion.li>
          ))}
        </ol>

        <motion.div
          initial={reduceMotion ? false : { y: 10 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={springEnter}
          className="mt-12"
        >
          <Button asChild className="rounded-xl gradient-brand text-white shadow-soft">
            <Link to="/register">
              Check your offer <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </section>

      <section className="border-y bg-muted/35">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <motion.blockquote
            initial={reduceMotion ? false : { y: 12 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={springEnter}
            className="mx-auto max-w-3xl"
          >
            <p className="font-display text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
              “After CRB clearance, stock money hit my M-Pesa. What I saw on the offer is what I paid.”
            </p>
            <footer className="mt-6 text-sm text-muted-foreground">Shop owner · Nairobi</footer>
          </motion.blockquote>
        </div>
      </section>

      <section id="faq" className="border-t bg-muted/25">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <motion.h2
            initial={reduceMotion ? false : { y: 12 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={springEnter}
            className="font-display text-center text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Before you apply
          </motion.h2>
          <Accordion type="single" collapsible className="mt-10">
            {faqs.map((item, index) => (
              <motion.div
                key={item.q}
                initial={reduceMotion ? false : { y: 10 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ ...springEnter, delay: reduceMotion ? 0 : index * 0.05 }}
              >
                <AccordionItem value={`faq-${index}`} className="border-b">
                  <AccordionTrigger className="text-left font-semibold">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:pb-24">
        <motion.div
          initial={reduceMotion ? false : { y: 12 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={springEnter}
          className="landing-hero-plane relative overflow-hidden rounded-[1.75rem] px-8 py-12 text-white shadow-elevated sm:px-12 sm:py-16"
        >
          <h2 className="font-display max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
            Borrow what you need. Repay in one month.
          </h2>
          <p className="mt-3 max-w-lg text-white/85">
            Personal loan or salary advance — same clear offer, same M-Pesa payout after CRB clearance.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 rounded-xl bg-white px-6 text-base font-semibold text-[oklch(0.35_0.16_258)] hover:bg-white/95">
              <Link to="/register">
                Create account <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-xl border-white/35 bg-white/5 px-6 text-base text-white backdrop-blur-sm hover:bg-white/10 hover:text-white"
            >
              <Link to="/apply" search={{ product: "salary-advance" }}>
                Salary advance
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      <footer className="border-t">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
          <div>
            <Logo height={64} className="max-w-[280px]" />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Digital loans for Kenya, with M-Pesa payout and an offer you can read before you accept.
            </p>
          </div>
          {(
            [
              {
                heading: "Product",
                links: [
                  ["Apply", isSignedIn ? "/apply" : "/register"],
                  ["Salary advance", isSignedIn ? "/apply?product=salary-advance" : "/register"],
                  ["Dashboard", "/dashboard"],
                  ["How it works", "#how"],
                ],
              },
              {
                heading: "Help",
                links: [
                  ["FAQ", "#faq"],
                  ["Support", "/support"],
                  isSignedIn ? ["Invite", "/referrals"] : ["Sign in", "/login"],
                ],
              },
              { heading: "Legal", links: [["Terms", "/terms"], ["Privacy", "/privacy"], ["Compliance", "#"]] },
            ] as { heading: string; links: readonly (readonly [string, string])[] }[]
          ).map((column) => (
            <div key={column.heading}>
              <p className="text-sm font-semibold">{column.heading}</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {column.links.map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="transition-colors hover:text-foreground">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} HarakaCash. Nairobi, Kenya.</p>
            <p>Loans subject to eligibility. Terms apply.</p>
          </div>
        </div>
      </footer>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          }),
        }}
      />
    </div>
  );
}
