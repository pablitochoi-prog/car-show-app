import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { TextFilterMode } from "./text-filter";

function keywordMatchSql(mode: TextFilterMode, value: string): Prisma.Sql {
  switch (mode) {
    case "equals":
      return Prisma.sql`kw ILIKE ${value}`;
    case "startsWith":
      return Prisma.sql`kw ILIKE ${`${value}%`}`;
    case "endsWith":
      return Prisma.sql`kw ILIKE ${`%${value}`}`;
    case "notContains":
      return Prisma.sql`kw NOT ILIKE ${`%${value}%`}`;
    case "contains":
    default:
      return Prisma.sql`kw ILIKE ${`%${value}%`}`;
  }
}

async function findIdsByKeywordMatch(
  mode: TextFilterMode,
  value: string,
): Promise<string[]> {
  const trimmed = value.trim();
  if (!trimmed) return [];

  const match = keywordMatchSql(mode, trimmed);
  const rows = await prisma.$queryRaw<{ id: string }[]>(
    mode === "notContains"
      ? Prisma.sql`
          SELECT id FROM "KnowledgeArticle"
          WHERE NOT EXISTS (
            SELECT 1 FROM unnest(keywords) AS kw
            WHERE ${match}
          )
        `
      : Prisma.sql`
          SELECT id FROM "KnowledgeArticle"
          WHERE EXISTS (
            SELECT 1 FROM unnest(keywords) AS kw
            WHERE ${match}
          )
        `,
  );
  return rows.map((row) => row.id);
}

/** Case-insensitive partial match against any keyword in the Postgres text array. */
export async function findKnowledgeArticleIdsMatchingKeywords(
  term: string,
): Promise<string[]> {
  return findIdsByKeywordMatch("contains", term);
}

export async function findKnowledgeArticleIdsForKeywordsFilter(
  mode: TextFilterMode,
  value: string,
): Promise<string[]> {
  return findIdsByKeywordMatch(mode, value);
}
