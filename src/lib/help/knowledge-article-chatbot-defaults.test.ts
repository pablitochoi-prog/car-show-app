import { describe, expect, it } from "vitest";
import {
  applyKnowledgeArticleChatbotDefaults,
  buildChatbotSummaryFromArticle,
  deriveChatbotKeywordsFromKeywords,
} from "./knowledge-article-chatbot-defaults";
import type { KnowledgeArticleFormInput } from "./knowledge-article-schemas";

function baseInput(
  overrides: Partial<KnowledgeArticleFormInput> = {},
): KnowledgeArticleFormInput {
  return {
    title: "Create account",
    slug: "create-account",
    shortDescription: "Sign up for a free account.",
    audience: "REGISTRANT",
    category: "getting-started",
    visibility: "public",
    published: true,
    featured: false,
    popular: false,
    sortOrder: 10,
    keywords: ["account", "signup"],
    relatedWebsitePages: [],
    relatedFeatures: [],
    relatedArticleIds: [],
    whoThisIsFor: "Anyone",
    whatThisHelpsYouDo: "Create an account",
    beforeYouStart: [],
    stepByStepInstructions: [
      { title: "Open sign-up", body: "<p>Go to the <strong>Sign Up</strong> page.</p>" },
    ],
    whatHappensNext: "Sign in",
    frequentlyAskedQuestions: [],
    articleBody: "",
    chatbotSummary: "",
    chatbotKeywords: [],
    lastReviewedAt: "2026-05-31",
    ...overrides,
  };
}

describe("knowledge article chatbot defaults", () => {
  it("derives chatbot keywords from keywords column", () => {
    expect(deriveChatbotKeywordsFromKeywords(["account", "signup"])).toEqual([
      "account",
      "signup",
    ]);
  });

  it("builds chatbot summary from description and steps", () => {
    const summary = buildChatbotSummaryFromArticle({
      title: "Create account",
      shortDescription: "Sign up for a free account.",
      stepByStepInstructions: [
        { title: "Open sign-up", body: "<p>Go to the Sign Up page.</p>" },
      ],
    });
    expect(summary).toContain("Sign up for a free account.");
    expect(summary).toContain("Open sign-up:");
    expect(summary).toContain("Go to the Sign Up page.");
  });

  it("fills blank chatbot fields on import", () => {
    const filled = applyKnowledgeArticleChatbotDefaults(baseInput());
    expect(filled.chatbotKeywords).toEqual(["account", "signup"]);
    expect(filled.chatbotSummary).toContain("Sign up for a free account.");
  });

  it("keeps explicit chatbot values when provided", () => {
    const filled = applyKnowledgeArticleChatbotDefaults(
      baseInput({
        chatbotSummary: "Custom summary",
        chatbotKeywords: ["custom"],
      }),
    );
    expect(filled.chatbotSummary).toBe("Custom summary");
    expect(filled.chatbotKeywords).toEqual(["custom"]);
  });
});
