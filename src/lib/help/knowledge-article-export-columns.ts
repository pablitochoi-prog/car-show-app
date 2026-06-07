/** Column order for knowledge article export/import (content fields first). */
export const KNOWLEDGE_ARTICLE_EXPORT_COLUMNS = [
  "articleNumber",
  "title",
  "shortDescription",
  "whoThisIsFor",
  "whatThisHelpsYouDo",
  "beforeYouStart",
  "stepByStepInstructions",
  "whatHappensNext",
  "frequentlyAskedQuestions",
  "articleBody",
  "chatbotSummary",
  "chatbotKeywords",
  "keywords",
  "audience",
  "slug",
  "category",
  "relatedWebsitePages",
  "relatedFeatures",
  "relatedArticleIds",
  "visibility",
  "published",
  "featured",
  "popular",
  "sortOrder",
  "lastReviewedAt",
] as const;

export type KnowledgeArticleExportColumn =
  (typeof KNOWLEDGE_ARTICLE_EXPORT_COLUMNS)[number];
