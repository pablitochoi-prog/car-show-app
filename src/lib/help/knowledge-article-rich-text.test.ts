import { describe, expect, it } from "vitest";
import {
  emptyKnowledgeFaq,
  emptyKnowledgeStep,
  isRichTextEmpty,
  looksLikeHtml,
  plainTextToEditorHtml,
  pruneKnowledgeFaqs,
  pruneKnowledgeSteps,
} from "./knowledge-article-rich-text";

describe("knowledge article rich text", () => {
  it("detects HTML content", () => {
    expect(looksLikeHtml("<p>Hi</p>")).toBe(true);
    expect(looksLikeHtml("Plain text")).toBe(false);
  });

  it("converts plain text paragraphs to editor HTML", () => {
    expect(plainTextToEditorHtml("Line one\n\nLine two")).toBe(
      "<p>Line one</p><p>Line two</p>",
    );
  });

  it("treats empty editor HTML as empty", () => {
    expect(isRichTextEmpty("<p></p>")).toBe(true);
    expect(isRichTextEmpty("<p>Hello</p>")).toBe(false);
  });

  it("prunes blank starter steps and faqs on save", () => {
    expect(pruneKnowledgeSteps([emptyKnowledgeStep()])).toEqual([]);
    expect(pruneKnowledgeFaqs([emptyKnowledgeFaq()])).toEqual([]);
    expect(
      pruneKnowledgeSteps([{ title: "One", body: "<p>Do it</p>" }]),
    ).toHaveLength(1);
  });
});
