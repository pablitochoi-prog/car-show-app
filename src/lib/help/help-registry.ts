import { HELP_ARTICLES } from "./help-articles";
import { getHelpCategoryLabel } from "./help-categories";
import {
  loadMergedHelpArticles,
  resolveMergedHelpArticleBySlug,
} from "./knowledge-article-store";
import { searchHelpArticles } from "./help-search";
import type {
  HelpArticle,
  HelpAudience,
  HelpCategory,
  HelpVisibility,
} from "./help-types";

export type HelpArticleFilters = {
  query?: string;
  audience?: HelpAudience;
  category?: HelpCategory;
  visibility?: HelpVisibility;
};

const FILE_ARTICLE_BY_SLUG = new Map(
  HELP_ARTICLES.map((a) => [a.slug, a] as const),
);

const FILE_ARTICLE_BY_ID = new Map(HELP_ARTICLES.map((a) => [a.id, a] as const));

function isVisibleToPublic(article: HelpArticle): boolean {
  return article.visibility === "public";
}

/** File-based articles only — used by contextual help links (Phase 3A). */
export function getAllHelpArticles(): HelpArticle[] {
  return [...HELP_ARTICLES];
}

export function getPublishedHelpArticles(): HelpArticle[] {
  return HELP_ARTICLES.filter((a) => a.published).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

export function getPublicPublishedArticles(): HelpArticle[] {
  return getPublishedHelpArticles().filter(isVisibleToPublic);
}

/** File-based slug lookup — contextual help links use this in Phase 3A. */
export function getHelpArticleBySlug(slug: string): HelpArticle | undefined {
  const article = FILE_ARTICLE_BY_SLUG.get(slug);
  if (!article?.published) return undefined;
  return article;
}

export function getHelpArticleById(id: string): HelpArticle | undefined {
  return FILE_ARTICLE_BY_ID.get(id);
}

export function getPublishedHelpSlugs(): string[] {
  return getPublicPublishedArticles().map((a) => a.slug);
}

export function filterHelpArticles(
  articles: HelpArticle[],
  filters: HelpArticleFilters,
): HelpArticle[] {
  let result = articles.filter((a) => a.published);

  if (filters.visibility) {
    result = result.filter((a) => a.visibility === filters.visibility);
  } else {
    result = result.filter(isVisibleToPublic);
  }

  if (filters.audience) {
    result = result.filter(
      (a) => a.audience === filters.audience || a.audience === "GENERAL",
    );
  }

  if (filters.category) {
    result = result.filter((a) => a.category === filters.category);
  }

  if (filters.query?.trim()) {
    result = searchHelpArticles(result, filters.query);
  } else {
    result = [...result].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return result;
}

export function queryHelpArticles(filters: HelpArticleFilters): HelpArticle[] {
  return filterHelpArticles(getPublishedHelpArticles(), filters);
}

export function getFeaturedHelpArticles(limit = 4): HelpArticle[] {
  return getPublicPublishedArticles().slice(0, limit);
}

export function getPopularHelpArticlesByAudience(
  audience: HelpAudience,
  limit = 4,
): HelpArticle[] {
  return getPublicPublishedArticles()
    .filter((a) => a.audience === audience)
    .slice(0, limit);
}

export function getRelatedHelpArticles(
  article: HelpArticle,
  allArticles: HelpArticle[],
  limit = 4,
): HelpArticle[] {
  const byId = new Map(allArticles.map((a) => [a.id, a]));
  const publicPublished = allArticles.filter(
    (a) => a.published && isVisibleToPublic(a),
  );

  const related: HelpArticle[] = [];

  for (const id of article.relatedArticleIds) {
    const match = byId.get(id);
    if (match?.published && isVisibleToPublic(match)) {
      related.push(match);
    }
    if (related.length >= limit) break;
  }

  if (related.length < limit) {
    for (const candidate of publicPublished) {
      if (candidate.id === article.id) continue;
      if (related.some((r) => r.id === candidate.id)) continue;
      if (candidate.category === article.category) {
        related.push(candidate);
      }
      if (related.length >= limit) break;
    }
  }

  return related.slice(0, limit);
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
