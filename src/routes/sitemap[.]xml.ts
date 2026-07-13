import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { getSitemapBlogEntries } from "@/lib/blog.server";
import { getSiteUrl } from "@/lib/seo";

const PUBLIC_PATHS: { path: string; changefreq: string; priority: string }[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/blog", changefreq: "weekly", priority: "0.9" },
  { path: "/faq", changefreq: "monthly", priority: "0.7" },
  { path: "/terms", changefreq: "yearly", priority: "0.5" },
  { path: "/privacy", changefreq: "yearly", priority: "0.5" },
  { path: "/support", changefreq: "monthly", priority: "0.6" },
  { path: "/register", changefreq: "monthly", priority: "0.8" },
];

function formatUrl(baseUrl: string, path: string, lastmod?: string) {
  const loc = `${baseUrl}${path}`;
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
  const entry = PUBLIC_PATHS.find((item) => item.path === path);
  const changefreq = entry?.changefreq ?? "monthly";
  const priority = entry?.priority ?? "0.6";
  return `  <url>
    <loc>${loc}</loc>${lastmodTag}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const baseUrl = getSiteUrl();
        const blogEntries = getSitemapBlogEntries();
        const staticUrls = PUBLIC_PATHS.map((item) => formatUrl(baseUrl, item.path)).join("\n");
        const blogUrls = blogEntries
          .map((entry) => formatUrl(baseUrl, `/blog/${entry.slug}`, entry.publishedAt))
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${blogUrls}
</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
