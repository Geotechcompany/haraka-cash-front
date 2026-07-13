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
