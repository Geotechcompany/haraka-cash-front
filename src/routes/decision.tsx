import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, XCircle, Calendar, ArrowRight, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { kes, loanQuote } from "@/lib/loan";
import { toast } from "sonner";

export const Route = createFileRoute("/decision")({
  head: () => ({ meta: [{ title: "Your decision — HarakaCash" }] }),
  component: DecisionPage,
});

function DecisionPage() {
  const navigate = useNavigate();
  const [quote, setQuote] = useState(loanQuote(15000, 3));
  const approved = quote.amount <= 100000; // demo: always approved in normal ranges

  useEffect(() => {
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem("haraka:quote");
      if (raw) try { setQuote(JSON.parse(raw)); } catch {}
    }
  }, []);

  const schedule = Array.from({ length: quote.months }).map((_, i) => ({
    n: i + 1,
    date: new Date(Date.now() + (i + 1) * 30 * 86400000).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }),
    amount: quote.monthly,
  }));

  if (!approved) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto text-center">
          <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }} className="mx-auto h-20 w-20 rounded-3xl bg-destructive/10 text-destructive grid place-items-center">
            <XCircle className="h-10 w-10" />
          </motion.div>
          <h1 className="mt-6 text-3xl font-bold">Application not approved</h1>
          <p className="mt-3 text-muted-foreground">Based on our current assessment, we're unable to offer you a loan at this time.</p>
          <div className="mt-6 card-soft p-6 text-left">
            <p className="text-sm font-semibold">How to improve eligibility</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc list-inside">
              <li>Repay any existing loans on time</li>
              <li>Increase your regular M-Pesa activity</li>
              <li>Update your employment and income details</li>
              <li>Try again after 30 days</li>
            </ul>
          </div>
          <Button asChild className="mt-6 rounded-xl gradient-brand text-white h-11 px-6"><Link to="/dashboard">Back to dashboard</Link></Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.6, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 15 }}
            className="mx-auto h-20 w-20 rounded-3xl bg-success/15 text-success grid place-items-center shadow-soft"
          >
            <CheckCircle2 className="h-10 w-10" />
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6 text-3xl md:text-4xl font-bold tracking-tight">
            You're approved! <Sparkles className="inline h-6 w-6 text-warning" />
          </motion.h1>
          <p className="mt-3 text-muted-foreground">Review the offer below. Accepting sends funds straight to your M-Pesa.</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-8 rounded-3xl gradient-brand text-white p-8 shadow-elevated">
          <p className="text-sm opacity-80 uppercase tracking-wide">Eligible amount</p>
          <p className="mt-2 text-5xl md:text-6xl font-bold tabular-nums">{kes(quote.amount)}</p>
          <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
            {[
              { l: "Interest", v: kes(quote.interest) },
              { l: "Processing fee", v: kes(quote.fee) },
              { l: "Total payable", v: kes(quote.totalPayable) },
            ].map((r) => (
              <div key={r.l} className="rounded-2xl bg-white/10 backdrop-blur p-4">
                <p className="text-xs uppercase tracking-wide opacity-80">{r.l}</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{r.v}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="mt-6 card-soft p-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <p className="font-semibold">Repayment schedule</p>
          </div>
          <div className="mt-4 divide-y">
            {schedule.map((s) => (
              <div key={s.n} className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="h-7 w-7 rounded-full bg-muted grid place-items-center text-xs font-semibold">{s.n}</span>
                  <span>{s.date}</span>
                </div>
                <span className="font-semibold tabular-nums">{kes(s.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
          <Button variant="outline" className="rounded-xl h-12 flex-1" onClick={() => navigate({ to: "/dashboard" })}>Reject offer</Button>
          <Button className="rounded-xl h-12 flex-1 gradient-brand text-white font-semibold shadow-soft" onClick={() => { toast.success("Offer accepted — disbursing to M-Pesa"); navigate({ to: "/loans" }); }}>
            Accept offer <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
