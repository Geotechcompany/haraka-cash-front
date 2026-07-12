import { createFileRoute, redirect } from "@tanstack/react-router";

import { isValidReferralCodeFormat, normalizeReferralCode } from "@/lib/referral";
import { trackReferralClick } from "@/server/referral-clicks";

export const Route = createFileRoute("/r/$code")({
  beforeLoad: async ({ params }) => {
    const code = normalizeReferralCode(params.code);
    if (!isValidReferralCodeFormat(code)) {
      throw redirect({ to: "/register" });
    }
    await trackReferralClick({ data: { code, source: "shortlink" } });
    throw redirect({
      to: "/register",
      search: { ref: code },
    });
  },
  component: () => null,
});
