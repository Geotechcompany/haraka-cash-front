export const SITEMAP_PUBLIC_PATHS: {
  path: string;
  changefreq: string;
  priority: string;
}[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/blog", changefreq: "weekly", priority: "0.9" },
  { path: "/faq", changefreq: "monthly", priority: "0.7" },
  { path: "/terms", changefreq: "yearly", priority: "0.5" },
  { path: "/privacy", changefreq: "yearly", priority: "0.5" },
  { path: "/support", changefreq: "monthly", priority: "0.6" },
  { path: "/register", changefreq: "monthly", priority: "0.8" },
];

export type SitemapBlogEntry = { slug: string; publishedAt: string };

function formatSitemapUrl(
  baseUrl: string,
  path: string,
  lastmod?: string,
  changefreq = "monthly",
  priority = "0.6",
) {
  const loc = `${baseUrl}${path}`;
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
  return `  <url>
    <loc>${loc}</loc>${lastmodTag}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export function buildSitemapXml(
  baseUrl: string,
  blogEntries: SitemapBlogEntry[] = [],
): string {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const staticUrls = SITEMAP_PUBLIC_PATHS.map((item) =>
    formatSitemapUrl(normalizedBase, item.path, undefined, item.changefreq, item.priority),
  ).join("\n");
  const blogUrls = blogEntries
    .map((entry) =>
      formatSitemapUrl(normalizedBase, `/blog/${entry.slug}`, entry.publishedAt),
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${blogUrls}
</urlset>`;
}

export const ROBOTS_DISALLOW_PATHS = [
  "/admin/",
  "/dashboard",
  "/api/",
  "/apply",
  "/decision",
  "/assessment",
  "/loans",
  "/profile",
  "/settings",
  "/notifications",
  "/referrals",
  "/login",
  "/otp",
  "/forgot",
];

export function buildRobotsTxt(siteUrl: string): string {
  const normalizedBase = siteUrl.replace(/\/$/, "");
  const disallowLines = ROBOTS_DISALLOW_PATHS.map((path) => `Disallow: ${path}`).join("\n");
  return `User-agent: *
Allow: /

${disallowLines}

Sitemap: ${normalizedBase}/sitemap.xml
`;
}
