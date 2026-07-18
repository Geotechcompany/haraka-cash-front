import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { getSiteUrl } from "@/lib/seo";
import { buildRobotsTxt } from "@/lib/sitemap";

const TEXT_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
} as const;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return new Response(buildRobotsTxt(getSiteUrl(request)), {
          headers: TEXT_HEADERS,
        });
      },
    },
  },
});
