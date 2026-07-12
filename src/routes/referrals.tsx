import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { Check, Copy, Gift, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { kes } from "@/lib/loan";
import { getReferralProgram } from "@/server/referrals";

export const Route = createFileRoute("/referrals")({
  head: () => ({ meta: [{ title: "Refer & earn — HarakaCash" }] }),
  loader: () => getReferralProgram(),
  component: ReferralsPage,
});

const springEnter = { type: "spring" as const, bounce: 0, duration: 0.4 };

function ReferralsPage() {
  const program = Route.useLoaderData();
  const reduceMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const [inviteUrl, setInviteUrl] = useState(program.invitePath);

  useEffect(() => {
    setInviteUrl(`${window.location.origin}${program.invitePath}`);
  }, [program.invitePath]);

  const copyLink = async () => {
    const url = `${window.location.origin}${program.invitePath}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select the link and copy manually");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0.2 } : springEnter}
        >
          <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
            Refer & earn
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Share your link. When someone joins, your credit limit goes up.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            You earn {kes(program.creditPerReferral)} available credit each time a new person
            creates an account with your link — up to {program.maxReferrals} people (
            {kes(program.maxCredits)} total). Credits raise your borrowing limit. They are not
            cash payouts.
          </p>
        </motion.div>

        <motion.section
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={
            reduceMotion ? { duration: 0.2, delay: 0.05 } : { ...springEnter, delay: 0.05 }
          }
          className="mt-8 overflow-hidden rounded-3xl gradient-brand p-6 text-white shadow-elevated md:p-8"
        >
          <p className="text-[11px] font-semibold tracking-[0.14em] text-white/65 uppercase">
            Your invite link
          </p>
          <p className="mt-3 break-all font-mono text-sm leading-relaxed text-white/95 md:text-base">
            {inviteUrl}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              type="button"
              size="lg"
              onClick={copyLink}
              className="rounded-xl bg-white font-semibold text-primary hover:bg-white/90"
            >
              {copied ? (
                <>
                  <Check className="mr-1 h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-4 w-4" /> Copy link
                </>
              )}
            </Button>
            <p className="flex items-center text-sm text-white/75">
              Code <span className="ml-2 font-mono font-semibold text-white">{program.code}</span>
            </p>
          </div>
        </motion.section>

        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={
            reduceMotion ? { duration: 0.2, delay: 0.1 } : { ...springEnter, delay: 0.1 }
          }
          className="mt-5 grid grid-cols-2 divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-soft sm:grid-cols-3 sm:divide-x"
        >
          <div className="border-b border-border px-4 py-4 sm:border-b-0 sm:px-5">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Joined
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xl font-semibold tabular-nums">
              <Users className="h-4 w-4 text-primary" aria-hidden />
              {program.successfulReferrals}
              <span className="text-sm font-normal text-muted-foreground">
                /{program.maxReferrals}
              </span>
            </p>
          </div>
          <div className="border-b border-border px-4 py-4 sm:border-b-0 sm:px-5">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Credits earned
            </p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums">
              {kes(program.creditsEarned)}
            </p>
          </div>
          <div className="col-span-2 px-4 py-4 sm:col-span-1 sm:px-5">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Slots left
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xl font-semibold tabular-nums">
              <Gift className="h-4 w-4 text-primary" aria-hidden />
              {program.remainingSlots}
            </p>
          </div>
        </motion.div>

        <motion.section
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={
            reduceMotion ? { duration: 0.2, delay: 0.15 } : { ...springEnter, delay: 0.15 }
          }
          className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft md:p-6"
        >
          <h2 className="font-semibold tracking-tight">How it works</h2>
          <ol className="mt-3 space-y-2.5 text-sm text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">1.</span> Share your link or code.
            </li>
            <li>
              <span className="font-medium text-foreground">2.</span> They create a HarakaCash
              account through that link.
            </li>
            <li>
              <span className="font-medium text-foreground">3.</span> You get{" "}
              {kes(program.creditPerReferral)} added to available credit once — no double awards,
              no self-referrals.
            </li>
          </ol>
          <Button asChild variant="outline" className="mt-5 rounded-xl">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </motion.section>

        {program.recent.length > 0 && (
          <motion.section
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={
              reduceMotion ? { duration: 0.2, delay: 0.2 } : { ...springEnter, delay: 0.2 }
            }
            className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
          >
            <div className="px-5 py-4 md:px-6">
              <h2 className="font-semibold tracking-tight">Recent invites</h2>
              <p className="text-xs text-muted-foreground">Credits already applied to your limit</p>
            </div>
            <ul className="divide-y divide-border">
              {program.recent.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 md:px-6"
                >
                  <div>
                    <p className="text-sm font-medium capitalize">{entry.status}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    {entry.creditAwarded > 0 ? `+${kes(entry.creditAwarded)}` : "—"}
                  </p>
                </li>
              ))}
            </ul>
          </motion.section>
        )}
      </div>
    </AppShell>
  );
}
