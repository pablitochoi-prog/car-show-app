import { describe, expect, it } from "vitest";
import type { KnowledgeArticle } from "@prisma/client";
import { HELP_ARTICLES } from "./help-articles";
import {
  mapDbRowToHelpArticle,
  mergeHelpArticleCatalog,
} from "./knowledge-article-store";

function mockDbRow(
  overrides: Partial<KnowledgeArticle> & Pick<KnowledgeArticle, "slug">,
): KnowledgeArticle {
  const base = HELP_ARTICLES.find((a) => a.slug === overrides.slug);
  return {
    id: overrides.id ?? "uuid-1",
    slug: overrides.slug,
    title: overrides.title ?? base?.title ?? "Title",
    shortDescription: overrides.shortDescription ?? base?.shortDescription ?? "Desc",
    audience: overrides.audience ?? base?.audience ?? "GENERAL",
    category: overrides.category ?? base?.category ?? "getting-started",
    visibility: overrides.visibility ?? "public",
    keywords: overrides.keywords ?? [],
    relatedWebsitePages: overrides.relatedWebsitePages ?? [],
    relatedFeatures: overrides.relatedFeatures ?? [],
    relatedArticleIds: overrides.relatedArticleIds ?? [],
    whoThisIsFor: overrides.whoThisIsFor ?? base?.whoThisIsFor ?? "Who",
    whatThisHelpsYouDo: overrides.whatThisHelpsYouDo ?? base?.whatThisHelpsYouDo ?? "What",
    beforeYouStart: overrides.beforeYouStart ?? [],
    stepByStepInstructions:
      overrides.stepByStepInstructions ?? base?.stepByStepInstructions ?? [],
    whatHappensNext: overrides.whatHappensNext ?? base?.whatHappensNext ?? "Next",
    frequentlyAskedQuestions:
      overrides.frequentlyAskedQuestions ?? base?.frequentlyAskedQuestions ?? [],
    articleBody: overrides.articleBody ?? base?.articleBody ?? "",
    chatbotSummary: overrides.chatbotSummary ?? base?.chatbotSummary ?? "Summary",
    chatbotKeywords: overrides.chatbotKeywords ?? [],
    sortOrder: overrides.sortOrder ?? base?.sortOrder ?? 0,
    featured: overrides.featured ?? false,
    popular: overrides.popular ?? false,
    published: overrides.published ?? true,
    lastReviewedAt: overrides.lastReviewedAt ?? new Date("2026-05-31"),
    archivedAt: overrides.archivedAt ?? null,
    createdByUserId: null,
    updatedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("knowledge article store", () => {
  it("maps DB row to HelpArticle shape", () => {
    const row = mockDbRow({
      slug: "create-account",
      featured: true,
      popular: false,
    });
    const article = mapDbRowToHelpArticle(row);
    expect(article.slug).toBe("create-account");
    expect(article.featured).toBe(true);
    expect(article.stepByStepInstructions.length).toBeGreaterThan(0);
  });

  it("returns file articles when DB is empty", () => {
    const merged = mergeHelpArticleCatalog(HELP_ARTICLES, []);
    expect(merged).toHaveLength(27);
    expect(merged.some((a) => a.slug === "create-account")).toBe(true);
  });

  it("DB article overrides file article by slug", () => {
    const row = mockDbRow({
      slug: "create-account",
      title: "DB Override Title",
    });
    const merged = mergeHelpArticleCatalog(HELP_ARTICLES, [row]);
    const article = merged.find((a) => a.slug === "create-account");
    expect(article?.title).toBe("DB Override Title");
  });

  it("unpublished DB article hides slug even if file exists", () => {
    const row = mockDbRow({
      slug: "create-account",
      published: false,
    });
    const merged = mergeHelpArticleCatalog(HELP_ARTICLES, [row]);
    expect(merged.some((a) => a.slug === "create-account")).toBe(false);
  });

  it("archived DB article hides slug even if file exists", () => {
    const row = mockDbRow({
      slug: "dash-cards",
      archivedAt: new Date(),
    });
    const merged = mergeHelpArticleCatalog(HELP_ARTICLES, [row]);
    expect(merged.some((a) => a.slug === "dash-cards")).toBe(false);
  });

  it("includes file-only slugs when partial DB exists", () => {
    const row = mockDbRow({ slug: "create-account", title: "From DB" });
    const merged = mergeHelpArticleCatalog(HELP_ARTICLES, [row]);
    expect(merged.some((a) => a.slug === "register-for-event")).toBe(true);
    expect(merged.find((a) => a.slug === "create-account")?.title).toBe("From DB");
  });
});
