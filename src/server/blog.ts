import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listBlogPosts = createServerFn({ method: "GET" }).handler(async () => {
  const { getAllPostSummaries } = await import("@/lib/blog.server");
  return getAllPostSummaries();
});

export const getBlogPost = createServerFn({ method: "GET" })
  .validator((slug: string) => z.string().min(1).parse(slug))
  .handler(async ({ data: slug }) => {
    const { getPostBySlug } = await import("@/lib/blog.server");
    return getPostBySlug(slug) ?? null;
  });
