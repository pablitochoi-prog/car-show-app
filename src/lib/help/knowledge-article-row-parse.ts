import type { KnowledgeArticle } from "@prisma/client";
import type { HelpArticleFaq, HelpArticleStep } from "./help-types";
import { formatKnowledgeArticleNumber } from "./knowledge-article-number";
import type { KnowledgeArticleFormInput } from "./knowledge-article-schemas";
import { knowledgeArticleCreateSchema } from "./knowledge-article-schemas";
import {
  encodeFaqsField,
  encodeLinesField,
  encodeStepsField,
  parseCommaOrLinesField,
  parseFaqsField,
  parseLinesField,
  parseStepsField,
} from "./knowledge-article-field-format";
import { applyKnowledgeArticleChatbotDefaults } from "./knowledge-article-chatbot-defaults";
import { KNOWLEDGE_ARTICLE_EXPORT_COLUMNS } from "./knowledge-article-export-columns";

function parseBool(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return v === "true" || v === "y" || v === "yes" || v === "1";
}

function asSteps(value: KnowledgeArticle["stepByStepInstructions"]): HelpArticleStep[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is HelpArticleStep =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as HelpArticleStep).title === "string" &&
      typeof (item as HelpArticleStep).body === "string",
  );
}

function asFaqs(value: KnowledgeArticle["frequentlyAskedQuestions"]): HelpArticleFaq[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is HelpArticleFaq =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as HelpArticleFaq).question === "string" &&
      typeof (item as HelpArticleFaq).answer === "string",
  );
}

function parseDateCell(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return trimmed;
}

export function knowledgeArticleToExportCells(
  row: KnowledgeArticle,
): Record<string, string | number> {
  return {
    articleNumber: formatKnowledgeArticleNumber(row.articleNumber),
    title: row.title,
    shortDescription: row.shortDescription,
    whoThisIsFor: row.whoThisIsFor,
    whatThisHelpsYouDo: row.whatThisHelpsYouDo,
    beforeYouStart: encodeLinesField(row.beforeYouStart),
    stepByStepInstructions: encodeStepsField(asSteps(row.stepByStepInstructions)),
    whatHappensNext: row.whatHappensNext,
    frequentlyAskedQuestions: encodeFaqsField(asFaqs(row.frequentlyAskedQuestions)),
    articleBody: row.articleBody,
    chatbotSummary: row.chatbotSummary,
    chatbotKeywords: row.chatbotKeywords.join(", "),
    keywords: row.keywords.join(", "),
    audience: row.audience,
    slug: row.slug,
    category: row.category,
    relatedWebsitePages: encodeLinesField(row.relatedWebsitePages),
    relatedFeatures: encodeLinesField(row.relatedFeatures),
    relatedArticleIds: row.relatedArticleIds.join(", "),
    visibility: row.visibility,
    published: row.published ? "true" : "false",
    featured: row.featured ? "true" : "false",
    popular: row.popular ? "true" : "false",
    sortOrder: row.sortOrder,
    lastReviewedAt: row.lastReviewedAt.toISOString().slice(0, 10),
  };
}

export function parseKnowledgeArticleRow(
  get: (name: string) => string,
  rowIndex: number,
): { input?: KnowledgeArticleFormInput; error?: string } {
  try {
    const input: KnowledgeArticleFormInput = {
      slug: get("slug"),
      title: get("title"),
      shortDescription: get("shortDescription"),
      audience: get("audience") as KnowledgeArticleFormInput["audience"],
      category: get("category") as KnowledgeArticleFormInput["category"],
      visibility: get("visibility") as KnowledgeArticleFormInput["visibility"],
      published: parseBool(get("published")),
      featured: parseBool(get("featured")),
      popular: parseBool(get("popular")),
      sortOrder: Number.parseInt(get("sortOrder") || "0", 10) || 0,
      keywords: parseCommaOrLinesField(get("keywords"), "keywords"),
      relatedWebsitePages: parseLinesField(get("relatedWebsitePages"), "relatedWebsitePages"),
      relatedFeatures: parseLinesField(get("relatedFeatures"), "relatedFeatures"),
      relatedArticleIds: parseCommaOrLinesField(
        get("relatedArticleIds"),
        "relatedArticleIds",
      ),
      whoThisIsFor: get("whoThisIsFor"),
      whatThisHelpsYouDo: get("whatThisHelpsYouDo"),
      beforeYouStart: parseLinesField(get("beforeYouStart"), "beforeYouStart"),
      stepByStepInstructions: parseStepsField(get("stepByStepInstructions")),
      whatHappensNext: get("whatHappensNext"),
      frequentlyAskedQuestions: parseFaqsField(get("frequentlyAskedQuestions")),
      articleBody: get("articleBody"),
      chatbotSummary: get("chatbotSummary"),
      chatbotKeywords: parseCommaOrLinesField(get("chatbotKeywords"), "chatbotKeywords"),
      lastReviewedAt: parseDateCell(get("lastReviewedAt")),
    };

    const withChatbotDefaults = applyKnowledgeArticleChatbotDefaults(input);
    const parsed = knowledgeArticleCreateSchema.safeParse(withChatbotDefaults);
    if (!parsed.success) {
      return {
        error: `Row ${rowIndex}: ${parsed.error.issues[0]?.message ?? "Invalid data."}`,
      };
    }
    return { input: parsed.data };
  } catch (e) {
    return {
      error: `Row ${rowIndex}: ${e instanceof Error ? e.message : "Invalid row."}`,
    };
  }
}

export { KNOWLEDGE_ARTICLE_EXPORT_COLUMNS };
