import { describe, expect, it } from "vitest";
import type { KnowledgeArticle } from "@prisma/client";
import {
  buildKnowledgeArticlesWorkbook,
  parseKnowledgeArticlesExcel,
} from "./knowledge-article-excel";

function sampleRow(): KnowledgeArticle {
  return {
    id: "uuid-1",
    articleNumber: 1,
    slug: "create-account",
    title: "Create account",
    shortDescription: "Desc",
    audience: "REGISTRANT",
    category: "getting-started",
    visibility: "public",
    keywords: ["account", "signup"],
    relatedWebsitePages: ["/signup"],
    relatedFeatures: ["account"],
    relatedArticleIds: ["register-for-event"],
    whoThisIsFor: "Who",
    whatThisHelpsYouDo: "What",
    beforeYouStart: ["Line one", "Line two"],
    stepByStepInstructions: [{ title: "Step 1", body: "Do thing" }],
    whatHappensNext: "Next",
    frequentlyAskedQuestions: [{ question: "Q?", answer: "A." }],
    articleBody: "Body paragraph one.\n\nBody paragraph two.",
    chatbotSummary: "Summary",
    chatbotKeywords: ["sign up"],
    sortOrder: 10,
    featured: true,
    popular: false,
    published: true,
    lastReviewedAt: new Date("2026-05-31"),
    archivedAt: null,
    createdByUserId: null,
    updatedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("knowledge article Excel", () => {
  it("exports and imports round-trip with excel-friendly multiline fields", async () => {
    const buffer = await buildKnowledgeArticlesWorkbook([sampleRow()]);
    const { rows, errors } = await parseKnowledgeArticlesExcel(buffer);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.input.slug).toBe("create-account");
    expect(rows[0]?.input.keywords).toEqual(["account", "signup"]);
    expect(rows[0]?.input.beforeYouStart).toEqual(["Line one", "Line two"]);
    expect(rows[0]?.input.stepByStepInstructions[0]?.title).toBe("Step 1");
    expect(rows[0]?.input.articleBody).toContain("Body paragraph two.");
  });

  it("derives chatbot fields when import cells are blank", async () => {
    const row = sampleRow();
    const blankChatbot = {
      ...row,
      chatbotSummary: "",
      chatbotKeywords: [],
    };
    const buffer = await buildKnowledgeArticlesWorkbook([blankChatbot]);
    const { rows, errors } = await parseKnowledgeArticlesExcel(buffer);
    expect(errors).toHaveLength(0);
    expect(rows[0]?.input.chatbotKeywords).toEqual(["account", "signup"]);
    expect(rows[0]?.input.chatbotSummary).toContain("Desc");
    expect(rows[0]?.input.chatbotSummary).toContain("Step 1");
  });
});
