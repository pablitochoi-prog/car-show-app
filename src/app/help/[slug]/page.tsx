import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HelpArticleBody } from "@/components/help/help-article-body";
import { getHelpCategoryLabel } from "@/lib/help/help-categories";
import {
  getHelpArticleBySlugAsync,
  getRelatedHelpArticlesAsync,
} from "@/lib/help/help-registry";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getHelpArticleBySlugAsync(slug);
  if (!article) {
    return { title: "Help article not found" };
  }
  return {
    title: article.title,
    description: article.shortDescription,
    keywords: article.keywords,
  };
}

export default async function HelpArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getHelpArticleBySlugAsync(slug);
  if (!article) notFound();

  const related = await getRelatedHelpArticlesAsync(article);
  const categoryLabel = getHelpCategoryLabel(article.category);

  return (
    <div className="page-shell max-w-2xl py-10 md:py-14">
      <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link
          href="/help"
          className="hover:text-foreground underline-offset-4 hover:underline"
        >
          Help Center
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/help?category=${article.category}`}
          className="hover:text-foreground underline-offset-4 hover:underline"
        >
          {categoryLabel}
        </Link>
      </nav>

      <h1 className="mt-4 text-3xl font-bold tracking-tight">{article.title}</h1>

      <div className="mt-8">
        <HelpArticleBody article={article} relatedArticles={related} />
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        <Link
          href="/help"
          className="text-foreground underline-offset-4 hover:underline"
        >
          ← Back to Help Center
        </Link>
      </p>
    </div>
  );
}
