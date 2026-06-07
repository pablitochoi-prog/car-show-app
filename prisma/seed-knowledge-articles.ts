/**
 * Backfill / seed knowledge articles from the file library.
 * Run with: npx tsx --env-file=.env.local prisma/seed-knowledge-articles.ts
 */
import { PrismaClient } from "@prisma/client";
import { seedKnowledgeArticlesFromFiles } from "../src/lib/help/seed-knowledge-articles-from-files";

const prisma = new PrismaClient();

async function main() {
  const beforeEmpty = await prisma.knowledgeArticle.count({
    where: { keywords: { isEmpty: true } },
  });
  const total = await prisma.knowledgeArticle.count();
  console.log("Before seed:", { total, emptyKeywords: beforeEmpty });

  const result = await seedKnowledgeArticlesFromFiles(null);
  console.log("Seed result:", JSON.stringify(result, null, 2));

  const afterEmpty = await prisma.knowledgeArticle.count({
    where: { keywords: { isEmpty: true } },
  });
  console.log("After seed:", {
    total: await prisma.knowledgeArticle.count(),
    emptyKeywords: afterEmpty,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
