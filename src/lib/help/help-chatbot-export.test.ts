import { describe, expect, it } from "vitest";
import { HELP_ARTICLES } from "./help-articles";
import {
  buildPlainTextContent,
  exportChatbotKnowledgeBase,
} from "./help-chatbot-export";
import { searchHelpArticles } from "./help-search";
import { getPublishedHelpArticles } from "./help-registry";

describe("help article library integrity", () => {
  it("has exactly 27 published articles", () => {
    expect(getPublishedHelpArticles()).toHaveLength(27);
    expect(HELP_ARTICLES).toHaveLength(27);
  });

  it("gives all published articles unique slugs and ids", () => {
    const published = getPublishedHelpArticles();
    const slugs = published.map((a) => a.slug);
    const ids = published.map((a) => a.id);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("requires chatbot fields on every published article", () => {
    for (const article of getPublishedHelpArticles()) {
      expect(article.chatbotSummary.trim().length).toBeGreaterThan(0);
      expect(article.chatbotKeywords.length).toBeGreaterThan(0);
      expect(article.keywords.length).toBeGreaterThan(0);
      expect(article.relatedWebsitePages.length).toBeGreaterThan(0);
      expect(article.visibility).toBe("public");
      expect(article.stepByStepInstructions.length).toBeGreaterThan(0);
    }
  });
});

describe("chatbot export", () => {
  it("includes only published public articles", async () => {
    const exported = await exportChatbotKnowledgeBase();
    expect(exported).toHaveLength(27);
    expect(exported.every((e) => e.articleId && e.slug)).toBe(true);
  });

  it("returns plain text content with steps and FAQs", async () => {
    const article = getPublishedHelpArticles().find(
      (a) => a.slug === "create-account",
    )!;
    const plain = buildPlainTextContent(article);
    expect(plain).toContain("How to create your CarShowScout account");
    expect(plain).toContain("Step-by-step instructions:");
    expect(plain).toContain("Common questions:");

    const exported = (await exportChatbotKnowledgeBase()).find(
      (e) => e.slug === "create-account",
    )!;
    expect(exported.plainTextContent.length).toBeGreaterThan(200);
    expect(exported.chatbotSummary).toBe(article.chatbotSummary);
    expect(exported.chatbotKeywords).toEqual(article.chatbotKeywords);
    expect(exported.lastReviewedAt).toBe(article.lastReviewedAt);
  });

  it("maps export fields for chatbot ingestion", async () => {
    const entry = (await exportChatbotKnowledgeBase()).find(
      (e) => e.slug === "connect-stripe",
    )!;
    expect(entry.title).toContain("Stripe");
    expect(entry.audience).toBe("ORGANIZER");
    expect(entry.category).toBe("stripe-setup");
    expect(entry.keywords.length).toBeGreaterThan(0);
    expect(entry.relatedWebsitePages.length).toBeGreaterThan(0);
  });
});

describe("help search chatbot keywords", () => {
  it("finds articles by chatbot keywords", () => {
    const results = searchHelpArticles(
      getPublishedHelpArticles(),
      "judge dashboard",
    );
    expect(
      results.some((a) => a.slug === "judge-access-assigned-events"),
    ).toBe(true);
  });

  it("finds troubleshooting articles by chatbot summary terms", () => {
    const results = searchHelpArticles(
      getPublishedHelpArticles(),
      "duplicate votes",
    );
    expect(results.some((a) => a.slug === "cannot-submit-vote")).toBe(true);
  });
});
