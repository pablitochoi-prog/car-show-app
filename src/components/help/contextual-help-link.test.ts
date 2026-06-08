import { describe, expect, it } from "vitest";
import { getHelpArticleBySlug } from "@/lib/help/help-file-registry";
import { resolveContextualHelpLink } from "./contextual-help-link";

/** Slugs wired in Phase 2B contextual help batch. */
export const PHASE_2B_CONTEXTUAL_HELP_SLUGS = [
  "create-and-publish-event",
  "connect-stripe",
  "setup-registration-tiers",
  "manage-event-registrations",
  "print-dash-cards",
  "setup-public-voting",
  "setup-judge-ballot-voting",
  "setup-score-sheet-judging",
  "event-reports",
  "judge-access-assigned-events",
  "scan-dash-card-qr-code",
  "public-voting",
] as const;

describe("ContextualHelpLink resolution", () => {
  it("resolves known slugs to title and href", () => {
    const resolved = resolveContextualHelpLink("connect-stripe");
    expect(resolved).not.toBeNull();
    expect(resolved?.href).toBe("/help/connect-stripe");
    expect(resolved?.title).toContain("Stripe");
  });

  it("returns null for missing or unknown slugs", () => {
    expect(resolveContextualHelpLink("not-a-real-article")).toBeNull();
    expect(resolveContextualHelpLink("")).toBeNull();
  });

  it("returns null for unpublished slugs", () => {
    expect(resolveContextualHelpLink("draft-article-that-does-not-exist")).toBeNull();
  });
});

describe("Phase 2B contextual help slugs", () => {
  it("registers every wired slug as a published article", () => {
    for (const slug of PHASE_2B_CONTEXTUAL_HELP_SLUGS) {
      const article = getHelpArticleBySlug(slug);
      expect(article, `missing article for slug: ${slug}`).toBeDefined();
      expect(article?.published).toBe(true);
      expect(article?.chatbotSummary.length).toBeGreaterThan(0);
    }
  });
});
