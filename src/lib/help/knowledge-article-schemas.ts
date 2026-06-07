import { z } from "zod";
import {
  isHelpAudience,
  isHelpCategory,
  isHelpVisibility,
  type HelpArticleFaq,
  type HelpArticleStep,
  type HelpAudience,
  type HelpCategory,
  type HelpVisibility,
} from "./help-types";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const helpArticleStepSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
});

export const helpArticleFaqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

function parseJsonArrayField<T>(
  raw: string,
  label: string,
  itemSchema: z.ZodType<T>,
): T[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
  const result = z.array(itemSchema).safeParse(parsed);
  if (!result.success) {
    throw new Error(`${label} JSON format is invalid.`);
  }
  return result.data;
}

export function parseStepsJson(raw: string): HelpArticleStep[] {
  return parseJsonArrayField(raw, "Step-by-step instructions", helpArticleStepSchema);
}

export function parseFaqsJson(raw: string): HelpArticleFaq[] {
  return parseJsonArrayField(raw, "FAQ", helpArticleFaqSchema);
}

export function parseLinesToArray(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseCommaSeparated(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

const knowledgeArticleBaseSchema = z.object({
  title: z.string().min(1, "Title is required."),
  slug: z
    .string()
    .min(1, "Slug is required.")
    .regex(slugRegex, "Slug must be lowercase kebab-case."),
  shortDescription: z.string().min(1, "Short description is required."),
  audience: z.string().refine(isHelpAudience, "Invalid audience."),
  category: z.string().refine(isHelpCategory, "Invalid category."),
  visibility: z.string().refine(isHelpVisibility, "Invalid visibility."),
  published: z.boolean(),
  featured: z.boolean(),
  popular: z.boolean(),
  sortOrder: z.number().int(),
  keywords: z.array(z.string()),
  relatedWebsitePages: z.array(z.string()),
  relatedFeatures: z.array(z.string()),
  relatedArticleIds: z.array(z.string()),
  whoThisIsFor: z.string().min(1),
  whatThisHelpsYouDo: z.string().min(1),
  beforeYouStart: z.array(z.string()),
  stepByStepInstructions: z.array(helpArticleStepSchema),
  whatHappensNext: z.string().min(1),
  frequentlyAskedQuestions: z.array(helpArticleFaqSchema),
  articleBody: z.string(),
  chatbotSummary: z.string().min(1),
  chatbotKeywords: z.array(z.string()),
  lastReviewedAt: z.string().min(1),
});

export const knowledgeArticleCreateSchema = knowledgeArticleBaseSchema;

export const knowledgeArticleUpdateSchema = knowledgeArticleBaseSchema.partial().extend({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).regex(slugRegex).optional(),
});

export const knowledgeArticleBulkSchema = z.object({
  action: z.enum(["publish", "unpublish", "archive"]),
  ids: z.array(z.string().min(1)).min(1),
});

export type KnowledgeArticleFormInput = z.infer<typeof knowledgeArticleCreateSchema>;

export function formRawToKnowledgeArticleInput(raw: {
  title: string;
  slug: string;
  shortDescription: string;
  audience: string;
  category: string;
  visibility: string;
  published: boolean;
  featured: boolean;
  popular: boolean;
  sortOrder: number;
  keywordsText: string;
  relatedWebsitePagesText: string;
  relatedFeaturesText: string;
  relatedArticleIdsText: string;
  whoThisIsFor: string;
  whatThisHelpsYouDo: string;
  beforeYouStartText: string;
  stepsJson: string;
  whatHappensNext: string;
  faqsJson: string;
  articleBody: string;
  chatbotSummary: string;
  chatbotKeywordsText: string;
  lastReviewedAt: string;
}): KnowledgeArticleFormInput {
  if (!isHelpAudience(raw.audience)) {
    throw new Error("Invalid audience.");
  }
  if (!isHelpCategory(raw.category)) {
    throw new Error("Invalid category.");
  }
  if (!isHelpVisibility(raw.visibility)) {
    throw new Error("Invalid visibility.");
  }

  return {
    title: raw.title.trim(),
    slug: raw.slug.trim(),
    shortDescription: raw.shortDescription.trim(),
    audience: raw.audience as HelpAudience,
    category: raw.category as HelpCategory,
    visibility: raw.visibility as HelpVisibility,
    published: raw.published,
    featured: raw.featured,
    popular: raw.popular,
    sortOrder: raw.sortOrder,
    keywords: parseCommaSeparated(raw.keywordsText),
    relatedWebsitePages: parseLinesToArray(raw.relatedWebsitePagesText),
    relatedFeatures: parseLinesToArray(raw.relatedFeaturesText),
    relatedArticleIds: parseCommaSeparated(raw.relatedArticleIdsText),
    whoThisIsFor: raw.whoThisIsFor.trim(),
    whatThisHelpsYouDo: raw.whatThisHelpsYouDo.trim(),
    beforeYouStart: parseLinesToArray(raw.beforeYouStartText),
    stepByStepInstructions: parseStepsJson(raw.stepsJson),
    whatHappensNext: raw.whatHappensNext.trim(),
    frequentlyAskedQuestions: parseFaqsJson(raw.faqsJson),
    articleBody: raw.articleBody,
    chatbotSummary: raw.chatbotSummary.trim(),
    chatbotKeywords: parseCommaSeparated(raw.chatbotKeywordsText),
    lastReviewedAt: raw.lastReviewedAt.trim(),
  };
}
