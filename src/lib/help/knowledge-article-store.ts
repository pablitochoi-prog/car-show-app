import type { KnowledgeArticle } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HELP_ARTICLES } from "./help-articles";
import type {
  HelpArticle,
  HelpArticleFaq,
  HelpArticleStep,
  HelpAudience,
  HelpCategory,
  HelpVisibility,
} from "./help-types";

const FILE_BY_SLUG = new Map(HELP_ARTICLES.map((a) => [a.slug, a] as const));

export type KnowledgeArticleSource = "database" | "files";

function parseSteps(value: unknown): HelpArticleStep[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is HelpArticleStep =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as HelpArticleStep).title === "string" &&
      typeof (item as HelpArticleStep).body === "string",
  );
}

function parseFaqs(value: unknown): HelpArticleFaq[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is HelpArticleFaq =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as HelpArticleFaq).question === "string" &&
      typeof (item as HelpArticleFaq).answer === "string",
  );
}

export function mapDbRowToHelpArticle(row: KnowledgeArticle): HelpArticle {
  return {
    id: row.slug,
    slug: row.slug,
    title: row.title,
    shortDescription: row.shortDescription,
    audience: row.audience as HelpAudience,
    category: row.category as HelpCategory,
    visibility: row.visibility as HelpVisibility,
    keywords: [...row.keywords],
    relatedWebsitePages: [...row.relatedWebsitePages],
    relatedFeatures: [...row.relatedFeatures],
    relatedArticleIds: [...row.relatedArticleIds],
    whoThisIsFor: row.whoThisIsFor,
    whatThisHelpsYouDo: row.whatThisHelpsYouDo,
    beforeYouStart: [...row.beforeYouStart],
    stepByStepInstructions: parseSteps(row.stepByStepInstructions),
    whatHappensNext: row.whatHappensNext,
    frequentlyAskedQuestions: parseFaqs(row.frequentlyAskedQuestions),
    articleBody: row.articleBody,
    chatbotSummary: row.chatbotSummary,
    chatbotKeywords: [...row.chatbotKeywords],
    lastReviewedAt: row.lastReviewedAt.toISOString().slice(0, 10),
    published: row.published,
    sortOrder: row.sortOrder,
    featured: row.featured,
    popular: row.popular,
  };
}

function isFilePublicPublished(article: HelpArticle): boolean {
  return article.published && article.visibility === "public";
}

function isDbPublicPublished(row: KnowledgeArticle): boolean {
  return (
    row.published &&
    row.visibility === "public" &&
    row.archivedAt == null
  );
}

function dbBlocksSlug(row: KnowledgeArticle | undefined): boolean {
  if (!row) return false;
  return Boolean(row.archivedAt) || !row.published;
}

async function getDbArticlesBySlug(): Promise<Map<string, KnowledgeArticle>> {
  const rows = await prisma.knowledgeArticle.findMany();
  return new Map(rows.map((row) => [row.slug, row]));
}

/** Pure merge: DB overrides by slug; unpublished/archived DB rows block file fallback. */
export function mergeHelpArticleCatalog(
  fileArticles: HelpArticle[],
  dbRows: KnowledgeArticle[],
): HelpArticle[] {
  const fileBySlug = new Map(fileArticles.map((a) => [a.slug, a]));
  const dbBySlug = new Map(dbRows.map((row) => [row.slug, row]));

  if (dbBySlug.size === 0) {
    return [...fileArticles];
  }

  const allSlugs = new Set<string>([
    ...fileArticles.map((a) => a.slug),
    ...dbBySlug.keys(),
  ]);

  const merged: HelpArticle[] = [];

  for (const slug of allSlugs) {
    const db = dbBySlug.get(slug);
    if (db) {
      if (dbBlocksSlug(db)) continue;
      merged.push(mapDbRowToHelpArticle(db));
      continue;
    }
    const file = fileBySlug.get(slug);
    if (file) merged.push(file);
  }

  return merged.sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Merge DB + file articles for the public Help Center catalog. */
export async function loadMergedHelpArticles(): Promise<HelpArticle[]> {
  try {
    const dbBySlug = await getDbArticlesBySlug();
    return mergeHelpArticleCatalog(HELP_ARTICLES, [...dbBySlug.values()]);
  } catch (error) {
    console.error("[knowledge-articles] DB load failed; using file articles.", error);
    return [...HELP_ARTICLES];
  }
}

export async function resolveMergedHelpArticleBySlug(
  slug: string,
): Promise<HelpArticle | undefined> {
  try {
    const dbBySlug = await getDbArticlesBySlug();

    if (dbBySlug.size === 0) {
      const file = FILE_BY_SLUG.get(slug);
      return file?.published ? file : undefined;
    }

    const db = dbBySlug.get(slug);
    if (db) {
      if (dbBlocksSlug(db)) return undefined;
      return mapDbRowToHelpArticle(db);
    }

    const file = FILE_BY_SLUG.get(slug);
    if (!file?.published) return undefined;
    return file;
  } catch (error) {
    console.error("[knowledge-articles] slug lookup failed; using file fallback.", error);
    const file = FILE_BY_SLUG.get(slug);
    return file?.published ? file : undefined;
  }
}

export async function getKnowledgeArticleSource(): Promise<KnowledgeArticleSource> {
  try {
    const count = await prisma.knowledgeArticle.count();
    return count > 0 ? "database" : "files";
  } catch {
    return "files";
  }
}

export function helpArticleToDbCreateInput(
  article: HelpArticle,
  extras: {
    featured: boolean;
    popular: boolean;
    userId?: string | null;
  },
) {
  return {
    slug: article.slug,
    title: article.title,
    shortDescription: article.shortDescription,
    audience: article.audience,
    category: article.category,
    visibility: article.visibility,
    keywords: article.keywords,
    relatedWebsitePages: article.relatedWebsitePages,
    relatedFeatures: article.relatedFeatures,
    relatedArticleIds: article.relatedArticleIds,
    whoThisIsFor: article.whoThisIsFor,
    whatThisHelpsYouDo: article.whatThisHelpsYouDo,
    beforeYouStart: article.beforeYouStart,
    stepByStepInstructions: article.stepByStepInstructions,
    whatHappensNext: article.whatHappensNext,
    frequentlyAskedQuestions: article.frequentlyAskedQuestions,
    articleBody: article.articleBody,
    chatbotSummary: article.chatbotSummary,
    chatbotKeywords: article.chatbotKeywords,
    sortOrder: article.sortOrder,
    featured: extras.featured,
    popular: extras.popular,
    published: article.published,
    lastReviewedAt: new Date(article.lastReviewedAt),
    createdByUserId: extras.userId ?? null,
    updatedByUserId: extras.userId ?? null,
  };
}

export { isFilePublicPublished, isDbPublicPublished, FILE_BY_SLUG };
