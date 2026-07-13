import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { Check, Copy, Gift, Users, MousePointerClick, MapPin, Share2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { kes } from "@/lib/loan";
import { buildReferralShareMessage } from "@/lib/referral";
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
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [inviteUrl, setInviteUrl] = useState(program.invitePath);
  const [shortUrl, setShortUrl] = useState(program.shortLinkPath);

  useEffect(() => {
    setInviteUrl(`${window.location.origin}${program.invitePath}`);
    setShortUrl(`${window.location.origin}${program.shortLinkPath}`);
    setCanNativeShare(typeof navigator.share === "function");
  }, [program.invitePath, program.shortLinkPath]);

  const shareInviteUrl = () =>
    `${window.location.origin}${program.shortLinkPath}`;

  const shareMessage = () =>
    buildReferralShareMessage({
      inviteUrl: shareInviteUrl(),
      code: program.code,
    });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage());
      setCopied(true);
      toast.success("Invite message copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select the link and copy manually");
    }
  };

  const shareInvite = async () => {
    const message = shareMessage();
    try {
      // text only — including `url` duplicates the link on WhatsApp and similar apps
      await navigator.share({
        title: "HarakaCash",
        text: message,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(message);
        setCopied(true);
        toast.success("Invite message copied");
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Could not share — copy the invite instead");
      }
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
          <p className="mt-2 text-xs text-white/70">
            Short link: <span className="font-mono text-white/90">{shortUrl}</span>
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
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
                  <Copy className="mr-1 h-4 w-4" /> Copy invite
                </>
              )}
            </Button>
            {canNativeShare && (
              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={shareInvite}
                className="rounded-xl border-white/40 bg-transparent font-semibold text-white hover:bg-white/10 hover:text-white"
              >
                <Share2 className="mr-1 h-4 w-4" /> Share
              </Button>
            )}
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
          className="mt-5 grid grid-cols-2 divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-soft sm:grid-cols-3 lg:grid-cols-6 sm:divide-x"
        >
          <div className="border-b border-border px-4 py-4 sm:border-b-0 sm:px-5">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Link clicks
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xl font-semibold tabular-nums">
              <MousePointerClick className="h-4 w-4 text-primary" aria-hidden />
              {program.linkClicks}
            </p>
          </div>
          <div className="border-b border-border px-4 py-4 sm:border-b-0 sm:px-5">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Signups
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xl font-semibold tabular-nums">
              <Users className="h-4 w-4 text-primary" aria-hidden />
              {program.signups}
            </p>
          </div>
          <div className="border-b border-border px-4 py-4 sm:border-b-0 sm:px-5">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Conversion
            </p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums">{program.conversionRate}%</p>
          </div>
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

        {program.recentClicks.length > 0 && (
          <motion.section
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={
              reduceMotion ? { duration: 0.2, delay: 0.12 } : { ...springEnter, delay: 0.12 }
            }
            className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
          >
            <div className="px-5 py-4 md:px-6">
              <h2 className="font-semibold tracking-tight">Recent link clicks</h2>
              <p className="text-xs text-muted-foreground">
                Approximate location from IP — raw addresses are never shown
              </p>
            </div>
            <ul className="divide-y divide-border">
              {program.recentClicks.map((click) => (
                <li
                  key={click.id}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 md:px-6"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      {click.location}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(click.createdAt).toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {click.source === "shortlink" ? "Short link" : "Register link"}
                    </p>
                  </div>
                  <span
                    className={
                      click.converted
                        ? "rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success"
                        : "rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                    }
                  >
                    {click.converted ? "Signed up" : "Clicked"}
                  </span>
                </li>
              ))}
            </ul>
          </motion.section>
        )}

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
