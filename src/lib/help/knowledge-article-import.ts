import { prisma } from "@/lib/db";
import {
  formInputToPrismaData,
  revalidateKnowledgeArticles,
} from "./knowledge-article-admin";
import type { ParsedKnowledgeArticleCsvRow } from "./knowledge-article-csv";
import { formatKnowledgeArticleNumber } from "./knowledge-article-number";
import { nextAvailableKnowledgeSlug } from "./knowledge-article-slug";

export type KnowledgeImportConflictResolution = "replace" | "keep_both";

export type KnowledgeImportConflict = {
  slug: string;
  importTitle: string;
  existingId: string;
  existingArticleNumber: number;
  existingDisplayId: string;
  existingTitle: string;
};

export type KnowledgeImportPreview = {
  totalRows: number;
  newCount: number;
  conflictCount: number;
  conflicts: KnowledgeImportConflict[];
  parseErrors: string[];
  rows: ParsedKnowledgeArticleCsvRow[];
};

export type KnowledgeImportApplyInput = {
  rows: ParsedKnowledgeArticleCsvRow[];
  resolutions: Record<string, KnowledgeImportConflictResolution>;
  confirmReplace: boolean;
  userId: string;
};

export type KnowledgeImportApplyResult = {
  created: number;
  replaced: number;
  keptBoth: number;
  skipped: number;
  errors: string[];
};

export async function previewKnowledgeArticleImport(
  parsedRows: ParsedKnowledgeArticleCsvRow[],
  parseErrors: string[],
): Promise<KnowledgeImportPreview> {
  const slugs = parsedRows.map((row) => row.input.slug);
  const existing = await prisma.knowledgeArticle.findMany({
    where: { slug: { in: slugs } },
    select: {
      id: true,
      slug: true,
      title: true,
      articleNumber: true,
    },
  });
  const existingBySlug = new Map(existing.map((row) => [row.slug, row]));

  const conflicts: KnowledgeImportConflict[] = [];
  let newCount = 0;

  for (const row of parsedRows) {
    const match = existingBySlug.get(row.input.slug);
    if (match) {
      conflicts.push({
        slug: row.input.slug,
        importTitle: row.input.title,
        existingId: match.id,
        existingArticleNumber: match.articleNumber,
        existingDisplayId: formatKnowledgeArticleNumber(match.articleNumber),
        existingTitle: match.title,
      });
    } else {
      newCount += 1;
    }
  }

  return {
    totalRows: parsedRows.length,
    newCount,
    conflictCount: conflicts.length,
    conflicts,
    parseErrors,
    rows: parsedRows,
  };
}

export async function applyKnowledgeArticleImport(
  input: KnowledgeImportApplyInput,
): Promise<KnowledgeImportApplyResult> {
  const result: KnowledgeImportApplyResult = {
    created: 0,
    replaced: 0,
    keptBoth: 0,
    skipped: 0,
    errors: [],
  };

  const replaceSlugs = Object.entries(input.resolutions)
    .filter(([, value]) => value === "replace")
    .map(([slug]) => slug);

  if (replaceSlugs.length > 0 && !input.confirmReplace) {
    result.errors.push("Replace actions require confirmReplace=true.");
    return result;
  }

  const allSlugs = new Set(
    (await prisma.knowledgeArticle.findMany({ select: { slug: true } })).map(
      (row) => row.slug,
    ),
  );

  for (const row of input.rows) {
    const resolution = input.resolutions[row.input.slug];
    const existing = await prisma.knowledgeArticle.findUnique({
      where: { slug: row.input.slug },
    });

    if (existing && !resolution) {
      result.skipped += 1;
      result.errors.push(
        `Row ${row.rowIndex}: slug "${row.input.slug}" exists — choose Replace or Keep both copies.`,
      );
      continue;
    }

    const data = formInputToPrismaData(row.input);

    try {
      if (existing && resolution === "replace") {
        await prisma.knowledgeArticle.update({
          where: { id: existing.id },
          data: {
            ...data,
            updatedByUserId: input.userId,
          },
        });
        result.replaced += 1;
        revalidateKnowledgeArticles(row.input.slug);
        continue;
      }

      let slug = row.input.slug;
      if (existing && resolution === "keep_both") {
        slug = nextAvailableKnowledgeSlug(row.input.slug, allSlugs);
        allSlugs.add(slug);
      } else {
        allSlugs.add(slug);
      }

      await prisma.knowledgeArticle.create({
        data: {
          ...data,
          slug,
          title:
            slug === row.input.slug
              ? row.input.title
              : `${row.input.title} (Import copy)`,
          createdByUserId: input.userId,
          updatedByUserId: input.userId,
        },
      });
      if (existing && resolution === "keep_both") result.keptBoth += 1;
      else result.created += 1;
      revalidateKnowledgeArticles(slug);
    } catch (e) {
      result.errors.push(
        `Row ${row.rowIndex}: ${e instanceof Error ? e.message : "Import failed."}`,
      );
    }
  }

  return result;
}
