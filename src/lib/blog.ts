import matter from "gray-matter";
import { marked } from "marked";

export interface BlogPostFrontmatter {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  author: string;
  tags: string[];
}

export interface BlogPostSummary extends BlogPostFrontmatter {
  readingMinutes: number;
}

export interface BlogPost extends BlogPostSummary {
  html: string;
}

const postModules = import.meta.glob("../../content/blog/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function parseFrontmatter(data: Record<string, unknown>): BlogPostFrontmatter {
  const title = String(data.title ?? "");
  const description = String(data.description ?? "");
  const slug = String(data.slug ?? "");
  const publishedAt = String(data.publishedAt ?? "");
  const author = String(data.author ?? "HarakaCash Team");
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];

  if (!title || !description || !slug || !publishedAt) {
    throw new Error("Blog post frontmatter requires title, description, slug, and publishedAt.");
  }

  return { title, description, slug, publishedAt, author, tags };
}

function parseFile(raw: string): BlogPost {
  const { data, content } = matter(raw);
  const frontmatter = parseFrontmatter(data as Record<string, unknown>);
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const html = marked.parse(content, { async: false }) as string;

  return {
    ...frontmatter,
    readingMinutes: Math.max(1, Math.ceil(words / 200)),
    html,
  };
}

let cachedPosts: BlogPost[] | null = null;

function loadPosts(): BlogPost[] {
  if (!cachedPosts) {
    cachedPosts = Object.values(postModules)
      .map(parseFile)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }
  return cachedPosts;
}

export function getAllPostSummaries(): BlogPostSummary[] {
  return loadPosts().map(({ html: _html, ...summary }) => summary);
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return loadPosts().find((post) => post.slug === slug);
}

export function getAllPostSlugs(): string[] {
  return loadPosts().map((post) => post.slug);
}

export function getSitemapBlogEntries(): { slug: string; publishedAt: string }[] {
  return loadPosts().map(({ slug, publishedAt }) => ({ slug, publishedAt }));
}
