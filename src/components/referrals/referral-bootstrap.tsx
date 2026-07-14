import { useAuth } from "@clerk/tanstack-react-start";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";

import {
  clearStoredReferralCode,
  persistReferralCode,
  readStoredReferralCode,
} from "@/lib/referral";
import { claimReferral } from "@/server/referrals";
import { getCurrentUser } from "@/server/applications";

/**
 * Captures `?ref=` into localStorage, then claims it once the user is signed in
 * and their Mongo user doc exists.
 */
export function ReferralBootstrap() {
  const { isLoaded, isSignedIn } = useAuth();
  const claim = useServerFn(claimReferral);
  const ensureUser = useServerFn(getCurrentUser);
  const claiming = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref");
    if (ref) persistReferralCode(ref);
    if (url.searchParams.has("__clerk_netlify_cache_bust")) {
      url.searchParams.delete("__clerk_netlify_cache_bust");
      const next = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState(window.history.state, "", next);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || claiming.current) return;
    const code = readStoredReferralCode();
    if (!code) return;

    claiming.current = true;
    void (async () => {
      try {
        await ensureUser();
        await claim({ data: { code } });
        clearStoredReferralCode();
      } catch {
        claiming.current = false;
      }
    })();
  }, [isLoaded, isSignedIn, claim, ensureUser]);

  return null;
}
