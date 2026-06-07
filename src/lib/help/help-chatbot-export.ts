import { getHelpCategoryLabel } from "./help-categories";
import { getPublishedHelpArticles } from "./help-registry";
import type { HelpArticle } from "./help-types";

export type ChatbotArticleExport = {
  articleId: string;
  title: string;
  slug: string;
  audience: HelpArticle["audience"];
  category: HelpArticle["category"];
  keywords: string[];
  relatedWebsitePages: string[];
  plainTextContent: string;
  chatbotSummary: string;
  chatbotKeywords: string[];
  lastReviewedAt: string;
};

/** Flattens structured article sections into plain text for RAG / chatbot ingestion. */
export function buildPlainTextContent(article: HelpArticle): string {
  const sections: string[] = [
    article.title,
    article.shortDescription,
    `Audience: ${article.audience}`,
    `Category: ${getHelpCategoryLabel(article.category)}`,
    "",
    "Who this is for:",
    article.whoThisIsFor,
    "",
    "What this helps you do:",
    article.whatThisHelpsYouDo,
  ];

  if (article.beforeYouStart.length > 0) {
    sections.push("", "Before you start:");
    for (const item of article.beforeYouStart) {
      sections.push(`- ${item}`);
    }
  }

  if (article.articleBody.trim()) {
    sections.push("", article.articleBody);
  }

  if (article.stepByStepInstructions.length > 0) {
    sections.push("", "Step-by-step instructions:");
    article.stepByStepInstructions.forEach((step, index) => {
      sections.push(`${index + 1}. ${step.title}`);
      sections.push(step.body);
    });
  }

  sections.push("", "What happens next:", article.whatHappensNext);

  if (article.frequentlyAskedQuestions.length > 0) {
    sections.push("", "Common questions:");
    for (const faq of article.frequentlyAskedQuestions) {
      sections.push(`Q: ${faq.question}`);
      sections.push(`A: ${faq.answer}`);
    }
  }

  if (article.keywords.length > 0) {
    sections.push("", `Keywords: ${article.keywords.join(", ")}`);
  }

  return sections.join("\n").trim();
}

function toChatbotExport(article: HelpArticle): ChatbotArticleExport {
  return {
    articleId: article.id,
    title: article.title,
    slug: article.slug,
    audience: article.audience,
    category: article.category,
    keywords: [...article.keywords],
    relatedWebsitePages: [...article.relatedWebsitePages],
    plainTextContent: buildPlainTextContent(article),
    chatbotSummary: article.chatbotSummary,
    chatbotKeywords: [...article.chatbotKeywords],
    lastReviewedAt: article.lastReviewedAt,
  };
}

/**
 * Export published, public help articles in a chatbot-friendly shape.
 * Lib-only — no HTTP route in Phase 2A.
 */
export function exportChatbotKnowledgeBase(): ChatbotArticleExport[] {
  return getPublishedHelpArticles()
    .filter((article) => article.visibility === "public")
    .map(toChatbotExport);
}
