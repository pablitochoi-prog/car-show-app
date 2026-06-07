import type { HelpArticleStep } from "./help-types";
import type { KnowledgeArticleFormInput } from "./knowledge-article-schemas";

const CHATBOT_SUMMARY_MAX_LENGTH = 600;

/** Strip HTML/rich text to plain text for chatbot summary generation. */
export function richTextToPlainText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<\/li>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildChatbotSummaryFromArticle(input: {
  title: string;
  shortDescription: string;
  stepByStepInstructions: HelpArticleStep[];
}): string {
  const parts: string[] = [];

  const description = input.shortDescription.trim();
  if (description) parts.push(description);

  for (const step of input.stepByStepInstructions) {
    const title = step.title.trim();
    const body = richTextToPlainText(step.body);
    if (title && body) {
      parts.push(`${title}: ${body}`);
    } else if (title) {
      parts.push(title);
    } else if (body) {
      parts.push(body);
    }
  }

  let summary = parts.join(" ").replace(/\s+/g, " ").trim();
  if (!summary) {
    summary = input.title.trim();
  }
  if (!summary) return "";

  if (summary.length > CHATBOT_SUMMARY_MAX_LENGTH) {
    return `${summary.slice(0, CHATBOT_SUMMARY_MAX_LENGTH - 3).trim()}...`;
  }
  return summary;
}

export function deriveChatbotKeywordsFromKeywords(keywords: string[]): string[] {
  return keywords.map((keyword) => keyword.trim()).filter(Boolean);
}

/** Fill blank chatbot fields during import from article content. */
export function applyKnowledgeArticleChatbotDefaults(
  input: KnowledgeArticleFormInput,
): KnowledgeArticleFormInput {
  const chatbotKeywords =
    input.chatbotKeywords.length > 0
      ? input.chatbotKeywords
      : deriveChatbotKeywordsFromKeywords(input.keywords);

  const chatbotSummary = input.chatbotSummary.trim()
    ? input.chatbotSummary.trim()
    : buildChatbotSummaryFromArticle({
        title: input.title,
        shortDescription: input.shortDescription,
        stepByStepInstructions: input.stepByStepInstructions,
      });

  return {
    ...input,
    chatbotKeywords,
    chatbotSummary,
  };
}
