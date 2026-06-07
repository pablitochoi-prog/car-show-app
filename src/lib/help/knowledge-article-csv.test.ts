import { describe, expect, it } from "vitest";
import type { KnowledgeArticle } from "@prisma/client";
import {
  buildKnowledgeArticlesCsv,
  knowledgeArticleToCsvRow,
} from "./knowledge-article-csv";

function sampleRow(): KnowledgeArticle {
  return {
    id: "uuid-1",
    slug: "create-account",
    title: "Create account",
    shortDescription: "Desc",
    audience: "REGISTRANT",
    category: "getting-started",
    visibility: "public",
    keywords: ["account", "signup"],
    relatedWebsitePages: [],
    relatedFeatures: [],
    relatedArticleIds: [],
    whoThisIsFor: "Who",
    whatThisHelpsYouDo: "What",
    beforeYouStart: [],
    stepByStepInstructions: [{ title: "Step 1", body: "Do thing" }],
    whatHappensNext: "Next",
    frequentlyAskedQuestions: [{ question: "Q?", answer: "A." }],
    articleBody: "",
    chatbotSummary: "Summary",
    chatbotKeywords: [],
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

describe("knowledge article CSV", () => {
  it("escapes JSON fields for complex columns", () => {
    const row = sampleRow();
    const csvRow = knowledgeArticleToCsvRow(row);
    expect(csvRow).toContain("create-account");
    expect(csvRow).toContain('""account""');
    expect(csvRow).toContain("signup");
    expect(csvRow).toContain("Step 1");
  });

  it("builds CSV with header row", () => {
    const csv = buildKnowledgeArticlesCsv([sampleRow()]);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toContain("slug");
    expect(lines[0]).toContain("stepByStepInstructions");
    expect(lines).toHaveLength(2);
  });
});
