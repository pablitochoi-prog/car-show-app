import type { HelpArticleFaq, HelpArticleStep } from "./help-types";
import { isPolicyHtmlEmpty } from "@/lib/sanitize-policy-html";

export const EMPTY_RICH_TEXT_HTML = "<p></p>";

export function emptyKnowledgeStep(): HelpArticleStep {
  return { title: "", body: EMPTY_RICH_TEXT_HTML };
}

export function emptyKnowledgeFaq(): HelpArticleFaq {
  return { question: "", answer: EMPTY_RICH_TEXT_HTML };
}

export function pruneKnowledgeSteps(steps: HelpArticleStep[]): HelpArticleStep[] {
  return steps.filter((step) => step.title.trim() && !isRichTextEmpty(step.body));
}

export function pruneKnowledgeFaqs(faqs: HelpArticleFaq[]): HelpArticleFaq[] {
  return faqs.filter(
    (faq) => faq.question.trim() && !isRichTextEmpty(faq.answer),
  );
}

/** True when value contains HTML-like markup. */
export function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value.trim());
}

/** Convert legacy plain-text article fields to HTML for the rich text editor. */
export function plainTextToEditorHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "<p></p>";
  if (looksLikeHtml(trimmed)) return trimmed;

  return trimmed
    .split(/\n\n+/)
    .map((paragraph) => {
      const inner = paragraph
        .split("\n")
        .map((line) =>
          line
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;"),
        )
        .join("<br>");
      return `<p>${inner}</p>`;
    })
    .join("");
}

export function isRichTextEmpty(html: string | null | undefined): boolean {
  return isPolicyHtmlEmpty(html);
}
