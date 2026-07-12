import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { CheckCircle2, XCircle, Calendar, ArrowRight, Sparkles, Smartphone, Clock } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { kes } from "@/lib/loan";
import { toast } from "sonner";
import { getApplication, getCurrentUser } from "@/server/applications";
import { initiateProcessingFeePayment } from "@/server/payments";

const decisionSearchSchema = z.object({
  applicationId: z.string().optional(),
});

export const Route = createFileRoute("/decision")({
  validateSearch: decisionSearchSchema,
  head: () => ({ meta: [{ title: "Your decision — HarakaCash" }] }),
  loaderDeps: ({ search }) => ({ applicationId: search?.applicationId }),
  loader: async ({ deps }) => {
    if (!deps.applicationId) {
      return { application: null, user: null };
    }
    try {
      const [application, user] = await Promise.all([
        getApplication({ data: deps.applicationId }),
        getCurrentUser(),
      ]);
      return { application, user };
    } catch {
      return { application: null, user: null };
    }
  },
  component: DecisionPage,
});

function DecisionPage() {
  const navigate = useNavigate();
  const { applicationId } = Route.useSearch();
  const { application, user } = Route.useLoaderData();
  const payFee = useServerFn(initiateProcessingFeePayment);
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [paying, setPaying] = useState(false);

  if (!applicationId) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto text-center">
          <h1 className="text-2xl font-bold">No application selected</h1>
          <p className="mt-3 text-muted-foreground">Start a new application to see your decision.</p>
          <Button asChild className="mt-6 rounded-xl gradient-brand text-white h-11 px-6"><Link to="/apply">Apply for a loan</Link></Button>
        </div>
      </AppShell>
    );
  }

  if (!application) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto text-center">
          <h1 className="text-2xl font-bold">Application not found</h1>
          <p className="mt-3 text-muted-foreground">
            We could not find an application with that reference. It may have expired or the link is incorrect.
          </p>
          <Button asChild className="mt-6 rounded-xl gradient-brand text-white h-11 px-6"><Link to="/apply">Apply for a loan</Link></Button>
        </div>
      </AppShell>
    );
  }

  if (!application.quote) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto text-center">
          <h1 className="text-2xl font-bold">Decision pending</h1>
          <p className="mt-3 text-muted-foreground">
            Your application is still being processed. Check back shortly or visit your dashboard.
          </p>
          <Button asChild className="mt-6 rounded-xl gradient-brand text-white h-11 px-6"><Link to="/dashboard">Go to dashboard</Link></Button>
        </div>
      </AppShell>
    );
  }

  const quote = application.quote;

  if (application.status === "UnderReview") {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto text-center">
          <motion.div
            initial={{ scale: 0.7 }}
            animate={{ scale: 1 }}
            className="mx-auto h-20 w-20 rounded-3xl bg-primary-soft text-primary grid place-items-center"
          >
            <Clock className="h-10 w-10" />
          </motion.div>
          <h1 className="mt-6 text-3xl font-bold">Under review for CRB checks</h1>
          <p className="mt-3 text-muted-foreground">
            We received your processing fee. Our team is running credit bureau (CRB) checks on application{" "}
            {application.id}. You will get a decision after this review — funds are not disbursed yet.
          </p>
          <Button asChild className="mt-6 rounded-xl gradient-brand text-white h-11 px-6">
            <Link to="/loans">View my loans</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (application.status === "Disbursing") {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto text-center">
          <motion.div
            initial={{ scale: 0.7 }}
            animate={{ scale: 1 }}
            className="mx-auto h-20 w-20 rounded-3xl bg-success/15 text-success grid place-items-center"
          >
            <CheckCircle2 className="h-10 w-10" />
          </motion.div>
          <h1 className="mt-6 text-3xl font-bold">Disbursement in progress</h1>
          <p className="mt-3 text-muted-foreground">
            CRB review is complete. Your loan of {kes(quote.amount)} is being sent to M-Pesa.
          </p>
          <Button asChild className="mt-6 rounded-xl gradient-brand text-white h-11 px-6">
            <Link to="/loans">View my loans</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const approved = application.status === "Approved";

  const schedule = Array.from({ length: quote.months }).map((_, i) => ({
    n: i + 1,
    date: new Date(Date.now() + (i + 1) * 30 * 86400000).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }),
    amount: quote.monthly,
  }));

  const handleAccept = async () => {
    if (!application?.id) {
      toast.error("Application not found");
      return;
    }

    setPaying(true);
    try {
      const result = await payFee({
        data: {
          applicationNumber: application.id,
          phone,
        },
      });
      toast.success(result.message);
      navigate({ to: "/loans" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to initiate M-Pesa payment");
    } finally {
      setPaying(false);
    }
  };

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
          <p className="mt-3 text-muted-foreground">
            Pay the processing fee via M-Pesa. After payment, our team runs CRB checks before disbursement.
          </p>
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
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="h-4 w-4 text-primary" />
            <p className="font-semibold">Pay processing fee via M-Pesa</p>
          </div>
          <p className="text-sm text-muted-foreground">
            We will send an STK push for {kes(quote.fee)}. Enter your M-Pesa PIN to accept the offer.
            Your application then goes to our team for CRB (credit bureau) checks — disbursement follows after review.
          </p>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="mpesa-phone">M-Pesa number</Label>
            <Input
              id="mpesa-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712 345 678"
              className="h-11 rounded-xl"
            />
          </div>
        </div>

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
          <Button
            disabled={paying || !phone.trim()}
            className="rounded-xl h-12 flex-1 gradient-brand text-white font-semibold shadow-soft"
            onClick={handleAccept}
          >
            {paying ? "Sending STK push..." : <>Pay fee & accept <ArrowRight className="ml-1 h-4 w-4" /></>}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
