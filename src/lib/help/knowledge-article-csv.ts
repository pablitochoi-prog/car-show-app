import type { KnowledgeArticle } from "@prisma/client";
import { csvRow } from "@/lib/event-reports/csv";

export const KNOWLEDGE_ARTICLE_CSV_HEADERS = [
  "slug",
  "title",
  "shortDescription",
  "audience",
  "category",
  "visibility",
  "published",
  "featured",
  "popular",
  "sortOrder",
  "keywords",
  "relatedWebsitePages",
  "relatedFeatures",
  "relatedArticleIds",
  "whoThisIsFor",
  "whatThisHelpsYouDo",
  "beforeYouStart",
  "stepByStepInstructions",
  "whatHappensNext",
  "frequentlyAskedQuestions",
  "articleBody",
  "chatbotSummary",
  "chatbotKeywords",
  "lastReviewedAt",
] as const;

function jsonCell(value: unknown): string {
  return JSON.stringify(value ?? []);
}

export function knowledgeArticleToCsvRow(row: KnowledgeArticle): string {
  return csvRow([
    row.slug,
    row.title,
    row.shortDescription,
    row.audience,
    row.category,
    row.visibility,
    row.published ? "true" : "false",
    row.featured ? "true" : "false",
    row.popular ? "true" : "false",
    row.sortOrder,
    jsonCell(row.keywords),
    jsonCell(row.relatedWebsitePages),
    jsonCell(row.relatedFeatures),
    jsonCell(row.relatedArticleIds),
    row.whoThisIsFor,
    row.whatThisHelpsYouDo,
    jsonCell(row.beforeYouStart),
    jsonCell(row.stepByStepInstructions),
    row.whatHappensNext,
    jsonCell(row.frequentlyAskedQuestions),
    row.articleBody,
    row.chatbotSummary,
    jsonCell(row.chatbotKeywords),
    row.lastReviewedAt.toISOString().slice(0, 10),
  ]);
}

export function buildKnowledgeArticlesCsv(rows: KnowledgeArticle[]): string {
  const lines = [csvRow([...KNOWLEDGE_ARTICLE_CSV_HEADERS])];
  for (const row of rows) {
    lines.push(knowledgeArticleToCsvRow(row));
  }
  return `${lines.join("\n")}\n`;
}
