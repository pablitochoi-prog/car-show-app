import { HELP_ARTICLES } from "./help-articles";
import { getHelpCategoryLabel } from "./help-categories";
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

const ARTICLE_BY_SLUG = new Map(
  HELP_ARTICLES.map((a) => [a.slug, a] as const),
);

const ARTICLE_BY_ID = new Map(HELP_ARTICLES.map((a) => [a.id, a] as const));

function isVisibleToPublic(article: HelpArticle): boolean {
  return article.visibility === "public";
}

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

export function getHelpArticleBySlug(slug: string): HelpArticle | undefined {
  const article = ARTICLE_BY_SLUG.get(slug);
  if (!article?.published) return undefined;
  return article;
}

export function getHelpArticleById(id: string): HelpArticle | undefined {
  return ARTICLE_BY_ID.get(id);
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
  limit = 4,
): HelpArticle[] {
  const related: HelpArticle[] = [];

  for (const id of article.relatedArticleIds) {
    const match = getHelpArticleById(id);
    if (match?.published && isVisibleToPublic(match)) {
      related.push(match);
    }
    if (related.length >= limit) break;
  }

  if (related.length < limit) {
    for (const candidate of getPublicPublishedArticles()) {
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
