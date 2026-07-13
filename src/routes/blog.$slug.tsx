import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { format } from "date-fns";
import { BlogPageShell } from "@/components/blog/blog-page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildArticleSchema,
  buildJsonLdGraph,
  buildOrganizationSchema,
  buildPageMeta,
} from "@/lib/seo";
import { getBlogPost } from "@/server/blog";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await getBlogPost({ data: params.slug });
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    const post = loaderData?.post;
    if (!post) return {};
    return buildPageMeta({
      title: `${post.title} | HarakaCash Blog`,
      description: post.description,
      path: `/blog/${post.slug}`,
      ogType: "article",
    });
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const { post } = Route.useLoaderData();

  return (
    <BlogPageShell
      title={post.title}
      meta={
        <>
          <span>{post.author}</span>
          <span aria-hidden>·</span>
          <time dateTime={post.publishedAt}>
            {format(new Date(post.publishedAt), "d MMMM yyyy")}
          </time>
          <span aria-hidden>·</span>
          <span>{post.readingMinutes} min read</span>
        </>
      }
    >
      <JsonLd
        data={buildJsonLdGraph([
          buildOrganizationSchema(),
          buildArticleSchema({
            title: post.title,
            description: post.description,
            slug: post.slug,
            publishedAt: post.publishedAt,
            author: post.author,
          }),
        ])}
      />

      <div
        className="prose-blog mt-10"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />

      <div className="mt-12 flex flex-wrap gap-2 border-t pt-8">
        {post.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="card-soft mt-10 p-6">
        <h2 className="text-lg font-semibold">Ready to check your offer?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          See fees upfront, then get paid to M-Pesa after CRB clearance.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/register"
            className="inline-flex items-center justify-center rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-soft"
          >
            Create account
          </Link>
          <Link
            to="/apply"
            search={{ product: "salary-advance" }}
            className="inline-flex items-center justify-center rounded-xl border px-5 py-2.5 text-sm font-semibold"
          >
            Salary advance
          </Link>
        </div>
      </div>

      <p className="mt-8 text-sm">
        <Link to="/blog" className="text-primary hover:underline">
          ← All articles
        </Link>
      </p>
    </BlogPageShell>
  );
}
