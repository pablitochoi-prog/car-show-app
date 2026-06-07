import { describe, expect, it } from "vitest";
import { searchHelpArticles } from "./help-search";
import {
  filterHelpArticles,
  getFeaturedHelpArticles,
  getHelpArticleBySlug,
  getPopularHelpArticlesByAudience,
  getPublishedHelpArticles,
  getPublishedHelpSlugs,
  getPublicPublishedArticles,
  getRelatedHelpArticles,
  queryHelpArticles,
} from "./help-registry";

describe("help registry", () => {
  it("returns published articles sorted by sortOrder", () => {
    const articles = getPublishedHelpArticles();
    expect(articles).toHaveLength(27);
    for (let i = 1; i < articles.length; i++) {
      expect(articles[i].sortOrder).toBeGreaterThanOrEqual(
        articles[i - 1].sortOrder,
      );
    }
  });

  it("looks up articles by slug", () => {
    expect(getHelpArticleBySlug("create-account")?.title).toContain("account");
    expect(getHelpArticleBySlug("missing-slug")).toBeUndefined();
  });

  it("lists published slugs for static generation", () => {
    const slugs = getPublishedHelpSlugs();
    expect(slugs).toContain("create-account");
    expect(slugs).toContain("event-reports");
  });

  it("filters by audience", () => {
    const organizer = queryHelpArticles({ audience: "ORGANIZER" });
    expect(organizer.every((a) => a.audience === "ORGANIZER" || a.audience === "GENERAL")).toBe(
      true,
    );
    expect(organizer.some((a) => a.slug === "connect-stripe")).toBe(true);
  });

  it("filters by category", () => {
    const dash = queryHelpArticles({ category: "dash-cards" });
    expect(dash.every((a) => a.category === "dash-cards")).toBe(true);
    expect(dash.some((a) => a.slug === "dash-cards")).toBe(true);
  });

  it("searches by query", () => {
    const stripe = queryHelpArticles({ query: "stripe" });
    expect(stripe.some((a) => a.slug === "connect-stripe")).toBe(true);
  });

  it("returns featured and popular sections", () => {
    expect(getFeaturedHelpArticles(3).length).toBe(3);
    expect(
      getPopularHelpArticlesByAudience("REGISTRANT", 2).every(
        (a) => a.audience === "REGISTRANT",
      ),
    ).toBe(true);
  });

  it("resolves related articles by id", () => {
    const article = getHelpArticleBySlug("register-for-event");
    expect(article).toBeDefined();
    const related = getRelatedHelpArticles(article!);
    expect(related.some((a) => a.slug === "create-account")).toBe(true);
  });

  it("defaults all starter articles to public visibility", () => {
    expect(
      getPublicPublishedArticles().every((a) => a.visibility === "public"),
    ).toBe(true);
  });

  it("includes chatbot-ready fields on articles", () => {
    const article = getHelpArticleBySlug("dash-cards");
    expect(article?.chatbotSummary.length).toBeGreaterThan(0);
    expect(article?.chatbotKeywords.length).toBeGreaterThan(0);
    expect(article?.relatedWebsitePages.length).toBeGreaterThan(0);
  });
});

describe("help search", () => {
  it("matches title and keywords", () => {
    const results = searchHelpArticles(getPublishedHelpArticles(), "QR code");
    expect(results.some((a) => a.slug === "dash-cards")).toBe(true);
  });

  it("returns all articles when query is empty", () => {
    expect(searchHelpArticles(getPublishedHelpArticles(), "").length).toBe(
      getPublishedHelpArticles().length,
    );
  });

  it("filters articles in filterHelpArticles with combined filters", () => {
    const results = filterHelpArticles(getPublishedHelpArticles(), {
      query: "vote",
      audience: "SPECTATOR",
    });
    expect(results.some((a) => a.slug === "public-voting")).toBe(true);
  });
});
