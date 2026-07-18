import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildRobotsTxt, buildSitemapXml } from "@/lib/sitemap";

describe("buildSitemapXml", () => {
  it("emits valid urlset with absolute https locs", () => {
    const xml = buildSitemapXml("https://harakacashkenya.dpdns.org");
    assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
    assert.match(xml, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
    assert.match(xml, /<loc>https:\/\/harakacashkenya\.dpdns\.org\/<\/loc>/);
    assert.match(xml, /<loc>https:\/\/harakacashkenya\.dpdns\.org\/blog<\/loc>/);
    assert.doesNotMatch(xml, /harakacash\.netlify\.app/);
  });

  it("includes blog entries with lastmod", () => {
    const xml = buildSitemapXml("https://example.com", [
      { slug: "sample-post", publishedAt: "2026-02-01" },
    ]);
    assert.match(xml, /<loc>https:\/\/example\.com\/blog\/sample-post<\/loc>/);
    assert.match(xml, /<lastmod>2026-02-01<\/lastmod>/);
  });

  it("strips trailing slash from base URL", () => {
    const xml = buildSitemapXml("https://example.com/");
    assert.match(xml, /<loc>https:\/\/example\.com\/faq<\/loc>/);
    assert.doesNotMatch(xml, /example\.com\/\//);
  });
});

describe("buildRobotsTxt", () => {
  it("points Sitemap to the site origin", () => {
    const robots = buildRobotsTxt("https://harakacashkenya.dpdns.org");
    assert.match(robots, /^Sitemap: https:\/\/harakacashkenya\.dpdns\.org\/sitemap\.xml$/m);
  });
});
