import { revalidatePath } from "next/cache";
import type { KnowledgeArticle } from "@prisma/client";
import type { KnowledgeArticleFormInput } from "./knowledge-article-schemas";

export function revalidateKnowledgeArticles(slug?: string) {
  revalidatePath("/help");
  if (slug) revalidatePath(`/help/${slug}`);
}

export function formInputToPrismaData(input: KnowledgeArticleFormInput) {
  return {
    slug: input.slug,
    title: input.title,
    shortDescription: input.shortDescription,
    audience: input.audience,
    category: input.category,
    visibility: input.visibility,
    keywords: input.keywords,
    relatedWebsitePages: input.relatedWebsitePages,
    relatedFeatures: input.relatedFeatures,
    relatedArticleIds: input.relatedArticleIds,
    whoThisIsFor: input.whoThisIsFor,
    whatThisHelpsYouDo: input.whatThisHelpsYouDo,
    beforeYouStart: input.beforeYouStart,
    stepByStepInstructions: input.stepByStepInstructions,
    whatHappensNext: input.whatHappensNext,
    frequentlyAskedQuestions: input.frequentlyAskedQuestions,
    articleBody: input.articleBody,
    chatbotSummary: input.chatbotSummary,
    chatbotKeywords: input.chatbotKeywords,
    sortOrder: input.sortOrder,
    featured: input.featured,
    popular: input.popular,
    published: input.published,
    lastReviewedAt: new Date(input.lastReviewedAt),
  };
}

export function knowledgeArticleToFormDefaults(row: KnowledgeArticle) {
  return {
    title: row.title,
    slug: row.slug,
    shortDescription: row.shortDescription,
    audience: row.audience,
    category: row.category,
    visibility: row.visibility,
    published: row.published,
    featured: row.featured,
    popular: row.popular,
    sortOrder: row.sortOrder,
    keywordsText: row.keywords.join(", "),
    relatedWebsitePagesText: row.relatedWebsitePages.join("\n"),
    relatedFeaturesText: row.relatedFeatures.join("\n"),
    relatedArticleIdsText: row.relatedArticleIds.join(", "),
    whoThisIsFor: row.whoThisIsFor,
    whatThisHelpsYouDo: row.whatThisHelpsYouDo,
    beforeYouStartText: row.beforeYouStart.join("\n"),
    stepsJson: JSON.stringify(row.stepByStepInstructions, null, 2),
    whatHappensNext: row.whatHappensNext,
    faqsJson: JSON.stringify(row.frequentlyAskedQuestions, null, 2),
    articleBody: row.articleBody,
    chatbotSummary: row.chatbotSummary,
    chatbotKeywordsText: row.chatbotKeywords.join(", "),
    lastReviewedAt: row.lastReviewedAt.toISOString().slice(0, 10),
  };
}
