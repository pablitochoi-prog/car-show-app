import { getHelpCategoryLabel } from "./help-categories";
import {
  filterHelpArticles,
  getFeaturedHelpArticles,
  getHelpArticleById,
  getHelpArticleBySlug,
  getAllHelpArticles,
  getPopularHelpArticlesByAudience,
  getPublicPublishedArticles,
  getPublishedHelpArticles,
  getPublishedHelpSlugs,
  getRelatedHelpArticles,
  queryHelpArticles,
  type HelpArticleFilters,
} from "./help-file-registry";
import {
  loadMergedHelpArticles,
  resolveMergedHelpArticleBySlug,
} from "./knowledge-article-store";
import type { HelpArticle, HelpAudience } from "./help-types";

export type { HelpArticleFilters };

export {
  filterHelpArticles,
  getAllHelpArticles,
  getFeaturedHelpArticles,
  getHelpArticleById,
  getHelpArticleBySlug,
  getPopularHelpArticlesByAudience,
  getPublicPublishedArticles,
  getPublishedHelpArticles,
  getPublishedHelpSlugs,
  getRelatedHelpArticles,
  queryHelpArticles,
};

function isVisibleToPublic(article: HelpArticle): boolean {
  return article.visibility === "public";
}

// --- Async merged (DB + file) registry for public Help Center ---

export async function loadPublicHelpCatalog(): Promise<HelpArticle[]> {
  return loadMergedHelpArticles();
}

export async function getPublishedHelpArticlesAsync(): Promise<HelpArticle[]> {
  const articles = await loadMergedHelpArticles();
  return articles.filter((a) => a.published).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getPublicPublishedArticlesAsync(): Promise<HelpArticle[]> {
  const articles = await getPublishedHelpArticlesAsync();
  return articles.filter(isVisibleToPublic);
}

export async function getHelpArticleBySlugAsync(
  slug: string,
): Promise<HelpArticle | undefined> {
  const article = await resolveMergedHelpArticleBySlug(slug);
  if (!article?.published || !isVisibleToPublic(article)) return undefined;
  return article;
}

export async function getPublishedHelpSlugsAsync(): Promise<string[]> {
  const articles = await getPublicPublishedArticlesAsync();
  return articles.map((a) => a.slug);
}

export async function queryHelpArticlesAsync(
  filters: HelpArticleFilters,
): Promise<HelpArticle[]> {
  const articles = await getPublishedHelpArticlesAsync();
  return filterHelpArticles(articles, filters);
}

export async function getFeaturedHelpArticlesAsync(
  limit = 4,
): Promise<HelpArticle[]> {
  const articles = await getPublicPublishedArticlesAsync();
  const featured = articles
    .filter((a) => a.featured)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (featured.length > 0) return featured.slice(0, limit);
  return articles.slice(0, limit);
}

export async function getPopularHelpArticlesByAudienceAsync(
  audience: HelpAudience,
  limit = 4,
): Promise<HelpArticle[]> {
  const articles = await getPublicPublishedArticlesAsync();
  const popular = articles
    .filter(
      (a) =>
        a.popular &&
        (a.audience === audience || a.audience === "GENERAL"),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (popular.length > 0) return popular.slice(0, limit);
  return articles.filter((a) => a.audience === audience).slice(0, limit);
}

export async function getRelatedHelpArticlesAsync(
  article: HelpArticle,
  limit = 4,
): Promise<HelpArticle[]> {
  const catalog = await getPublicPublishedArticlesAsync();
  return getRelatedHelpArticles(article, catalog, limit);
}

export function formatHelpArticleReviewDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export { getHelpCategoryLabel };
