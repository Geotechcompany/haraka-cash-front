import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const trackInput = z.object({
  code: z.string().min(1).max(32),
  source: z.enum(["register", "shortlink"]),
});

/** Records a referral link click with IP geolocation (server-only handler). */
export const trackReferralClick = createServerFn({ method: "GET" })
  .validator((input: unknown) => trackInput.parse(input))
  .handler(async ({ data }) => {
    const { recordReferralClick } = await import("@/server/referral-clicks.server");
    const userAgent = getRequestHeader("user-agent");
    return recordReferralClick({
      code: data.code,
      source: data.source,
      userAgent,
    });
  });
