import { prisma } from "@/lib/db";
import { HELP_ARTICLES } from "./help-articles";
import { helpArticleToDbCreateInput } from "./knowledge-article-store";

export const SEED_FEATURED_SLUGS = new Set([
  "create-account",
  "register-for-event",
  "create-and-publish-event",
  "connect-stripe",
]);

export const SEED_POPULAR_SLUGS = new Set([
  "register-for-event",
  "dash-cards",
  "setup-public-voting",
  "event-reports",
  "connect-stripe",
]);

export type SeedKnowledgeArticlesResult = {
  created: number;
  skipped: number;
  keywordsBackfilled: number;
  slugsCreated: string[];
  slugsSkipped: string[];
  slugsKeywordsBackfilled: string[];
};

export async function seedKnowledgeArticlesFromFiles(
  userId?: string | null,
): Promise<SeedKnowledgeArticlesResult> {
  const existing = await prisma.knowledgeArticle.findMany({
    select: { slug: true },
  });
  const existingSlugs = new Set(existing.map((row) => row.slug));

  let created = 0;
  let skipped = 0;
  let keywordsBackfilled = 0;
  const slugsCreated: string[] = [];
  const slugsSkipped: string[] = [];
  const slugsKeywordsBackfilled: string[] = [];

  for (const article of HELP_ARTICLES) {
    if (existingSlugs.has(article.slug)) {
      skipped += 1;
      slugsSkipped.push(article.slug);

      if (article.keywords.length > 0) {
        const updated = await prisma.knowledgeArticle.updateMany({
          where: { slug: article.slug, keywords: { isEmpty: true } },
          data: { keywords: article.keywords, updatedByUserId: userId ?? null },
        });
        if (updated.count > 0) {
          keywordsBackfilled += updated.count;
          slugsKeywordsBackfilled.push(article.slug);
        }
      }
      continue;
    }

    await prisma.knowledgeArticle.create({
      data: helpArticleToDbCreateInput(article, {
        featured: SEED_FEATURED_SLUGS.has(article.slug),
        popular: SEED_POPULAR_SLUGS.has(article.slug),
        userId,
      }),
    });

    created += 1;
    slugsCreated.push(article.slug);
  }

  return {
    created,
    skipped,
    keywordsBackfilled,
    slugsCreated,
    slugsSkipped,
    slugsKeywordsBackfilled,
  };
}
