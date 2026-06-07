import type { HelpArticleFaq, HelpArticleStep } from "./help-types";
import { parseCommaSeparated, parseFaqsJson, parseLinesToArray, parseStepsJson } from "./knowledge-article-schemas";

export function encodeLinesField(items: string[]): string {
  return items.join("\n");
}

export function parseLinesField(raw: string, label: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error(`${label} must be a JSON array.`);
      }
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    } catch {
      throw new Error(`${label} must be valid JSON or one value per line.`);
    }
  }
  return parseLinesToArray(raw);
}

export function encodeStepsField(steps: HelpArticleStep[]): string {
  if (!steps.length) return "";
  return steps.map((step) => `## ${step.title}\n${step.body}`).join("\n\n");
}

export function parseStepsField(raw: string): HelpArticleStep[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    return parseStepsJson(trimmed);
  }

  const blocks = trimmed.split(/\n\n+/);
  const steps: HelpArticleStep[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const first = lines[0]?.trim() ?? "";
    if (!first.startsWith("## ")) {
      throw new Error(
        "stepByStepInstructions: use ## Step title on its own line, then the step body (blank line between steps).",
      );
    }
    const title = first.slice(3).trim();
    const body = lines.slice(1).join("\n").trim();
    if (!title || !body) {
      throw new Error("Each step needs a ## title and body text.");
    }
    steps.push({ title, body });
  }
  return steps;
}

export function encodeFaqsField(faqs: HelpArticleFaq[]): string {
  if (!faqs.length) return "";
  return faqs.map((faq) => `## ${faq.question}\n${faq.answer}`).join("\n\n");
}

export function parseFaqsField(raw: string): HelpArticleFaq[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    return parseFaqsJson(trimmed);
  }

  const blocks = trimmed.split(/\n\n+/);
  const faqs: HelpArticleFaq[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const first = lines[0]?.trim() ?? "";
    if (!first.startsWith("## ")) {
      throw new Error(
        "frequentlyAskedQuestions: use ## Question on its own line, then the answer (blank line between FAQs).",
      );
    }
    const question = first.slice(3).trim();
    const answer = lines.slice(1).join("\n").trim();
    if (!question || !answer) {
      throw new Error("Each FAQ needs a ## question and answer text.");
    }
    faqs.push({ question, answer });
  }
  return faqs;
}

export function parseCommaOrLinesField(raw: string, label: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    return parseLinesField(trimmed, label);
  }
  if (trimmed.includes("\n")) {
    return parseLinesToArray(trimmed);
  }
  return parseCommaSeparated(trimmed);
}
