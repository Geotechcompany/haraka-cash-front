import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { getSitemapBlogEntries } from "@/lib/blog.server";
import { getSiteUrl } from "@/lib/seo";
import { buildSitemapXml } from "@/lib/sitemap";

const XML_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
} as const;

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const baseUrl = getSiteUrl(request);
        let blogEntries: { slug: string; publishedAt: string }[] = [];
        try {
          blogEntries = getSitemapBlogEntries();
        } catch (error) {
          console.error("sitemap: blog entries unavailable, serving static URLs only", error);
        }

        return new Response(buildSitemapXml(baseUrl, blogEntries), {
          headers: XML_HEADERS,
        });
      },
    },
  },
});
