export const SITE_NAME = "HarakaCash";
export const DEFAULT_OG_IMAGE = "/hero.jpg";
const DEFAULT_SITE_URL = "https://harakacashkenya.dpdns.org";

function normalizeSiteUrl(url: string): string {
  return String(url).trim().replace(/\/$/, "");
}

export function getSiteUrl(request?: Request): string {
  const fromVite =
    typeof import.meta !== "undefined" ? import.meta.env.VITE_APP_URL : undefined;
  const fromProcess =
    typeof process !== "undefined"
      ? process.env.APP_URL ?? process.env.VITE_APP_URL
      : undefined;
  const fromEnv = fromVite ?? fromProcess;
  if (fromEnv) return normalizeSiteUrl(fromEnv);

  if (request) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (host && !host.startsWith("localhost") && !host.startsWith("127.0.0.1")) {
      const proto = request.headers.get("x-forwarded-proto") ?? "https";
      return normalizeSiteUrl(`${proto}://${host.split(",")[0].trim()}`);
    }
  }

  return normalizeSiteUrl(DEFAULT_SITE_URL);
}

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalized}`;
}

export function buildPageMeta({
  title,
  description,
  path,
  ogType = "website",
  ogImage = DEFAULT_OG_IMAGE,
  robots = "index, follow",
}: {
  title: string;
  description: string;
  path: string;
  ogType?: string;
  ogImage?: string;
  robots?: string;
}) {
  const url = absoluteUrl(path);
  const image = absoluteUrl(ogImage);

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: robots },
      { property: "og:type", content: ogType },
      { property: "og:url", content: url },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:image", content: image },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:locale", content: "en_KE" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export function buildOrganizationSchema() {
  const siteUrl = getSiteUrl();
  return {
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl,
    logo: absoluteUrl("/logo.png"),
    areaServed: "KE",
    contactPoint: {
      "@type": "ContactPoint",
      email: "help@harakacash.co.ke",
      contactType: "customer support",
      areaServed: "KE",
      availableLanguage: "English",
    },
  };
}

export function buildFinancialServiceSchema() {
  return {
    "@type": "FinancialService",
    name: SITE_NAME,
    description:
      "Digital personal loans and salary advances with M-Pesa payout for borrowers in Kenya.",
    url: getSiteUrl(),
    areaServed: { "@type": "Country", name: "Kenya" },
    currenciesAccepted: "KES",
    paymentAccepted: "M-Pesa",
  };
}

export function buildFaqSchema(faqs: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function buildWebSiteSchema() {
  return {
    "@type": "WebSite",
    name: SITE_NAME,
    url: getSiteUrl(),
    inLanguage: "en-KE",
    publisher: { "@type": "Organization", name: SITE_NAME },
  };
}

export function buildArticleSchema({
  title,
  description,
  slug,
  publishedAt,
  author,
  coverImage,
}: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  author: string;
  coverImage?: string;
}) {
  return {
    "@type": "Article",
    headline: title,
    description,
    image: [coverImage ?? absoluteUrl(DEFAULT_OG_IMAGE)],
    author: { "@type": "Organization", name: author },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: absoluteUrl("/logo.png") },
    },
    datePublished: publishedAt,
    dateModified: publishedAt,
    mainEntityOfPage: absoluteUrl(`/blog/${slug}`),
  };
}

export function buildBlogItemListSchema(
  posts: { title: string; slug: string; publishedAt: string }[],
) {
  return {
    "@type": "ItemList",
    itemListElement: posts.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/blog/${post.slug}`),
      name: post.title,
    })),
  };
}

export function buildJsonLdGraph(schemas: Record<string, unknown>[]) {
  return {
    "@context": "https://schema.org",
    "@graph": schemas,
  };
}
