import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { BlogPageShell } from "@/components/blog/blog-page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { getAllPostSummaries } from "@/lib/blog";
import {
  buildBlogItemListSchema,
  buildJsonLdGraph,
  buildOrganizationSchema,
  buildPageMeta,
  buildWebSiteSchema,
} from "@/lib/seo";

const BLOG_DESCRIPTION =
  "Practical guides on M-Pesa loans, salary advances, CRB checks, and borrowing safely in Kenya. Written by the HarakaCash team.";

export const Route = createFileRoute("/blog")({
  loader: () => getAllPostSummaries(),
  head: () =>
    buildPageMeta({
      title: "Blog — M-Pesa Loans & Borrowing Tips | HarakaCash",
      description: BLOG_DESCRIPTION,
      path: "/blog",
    }),
  component: BlogIndexPage,
});

function BlogIndexPage() {
  const posts = Route.useLoaderData();

  return (
    <BlogPageShell
      title="Borrowing guides for Kenya"
      subtitle="Short reads on M-Pesa loans, salary advances, fees, and repayment. No jargon."
    >
      <JsonLd
        data={buildJsonLdGraph([
          buildOrganizationSchema(),
          buildWebSiteSchema(),
          buildBlogItemListSchema(posts),
        ])}
      />

      <ul className="mt-10 space-y-4">
        {posts.map((post) => (
          <li key={post.slug}>
            <article className="card-soft p-5 transition-shadow hover:shadow-elevated sm:p-6">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <time dateTime={post.publishedAt}>
                  {format(new Date(post.publishedAt), "d MMM yyyy")}
                </time>
                <span aria-hidden>·</span>
                <span>{post.readingMinutes} min read</span>
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                <Link
                  to="/blog/$slug"
                  params={{ slug: post.slug }}
                  className="hover:text-primary"
                >
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {post.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          </li>
        ))}
      </ul>
    </BlogPageShell>
  );
}
