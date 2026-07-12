import { createFileRoute, redirect } from "@tanstack/react-router";

import { isValidReferralCodeFormat, normalizeReferralCode } from "@/lib/referral";

export const Route = createFileRoute("/r/$code")({
  beforeLoad: ({ params }) => {
    const code = normalizeReferralCode(params.code);
    if (!isValidReferralCodeFormat(code)) {
      throw redirect({ to: "/register" });
    }
    throw redirect({
      to: "/register",
      search: { ref: code },
    });
  },
  component: () => null,
});
