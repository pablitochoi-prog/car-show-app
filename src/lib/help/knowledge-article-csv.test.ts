import { describe, expect, it } from "vitest";
import type { KnowledgeArticle } from "@prisma/client";
import { csvRow } from "@/lib/event-reports/csv";
import {
  buildKnowledgeArticlesCsv,
  KNOWLEDGE_ARTICLE_CSV_HEADERS,
  knowledgeArticleToCsvRow,
  parseKnowledgeArticlesCsv,
} from "./knowledge-article-csv";

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
    expect(csvRow).toContain("account, signup");
    expect(csvRow).toContain("## Step 1");
  });

  it("builds CSV with header row in edit-friendly column order", () => {
    const csv = buildKnowledgeArticlesCsv([sampleRow()]);
    const header = csv.trim().split("\n")[0];
    expect(header).toBe(KNOWLEDGE_ARTICLE_CSV_HEADERS.join(","));
    expect(header.indexOf("title")).toBeLessThan(header.indexOf("slug"));
    expect(header.indexOf("articleBody")).toBeLessThan(header.indexOf("keywords"));
    const { rows, errors } = parseKnowledgeArticlesCsv(csv);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
  });

  it("parses exported CSV round-trip shape", () => {
    const csv = buildKnowledgeArticlesCsv([sampleRow()]);
    const { rows, errors } = parseKnowledgeArticlesCsv(csv);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.input.slug).toBe("create-account");
    expect(rows[0]?.input.keywords).toEqual(["account", "signup"]);
  });

  it("parses comma-separated keywords on import", () => {
    const header = buildKnowledgeArticlesCsv([sampleRow()]).trim().split("\n")[0];
    const row = sampleRow();
    const dataLine = csvRow([
      "KA-00002",
      row.title,
      row.shortDescription,
      row.whoThisIsFor,
      row.whatThisHelpsYouDo,
      "[]",
      "[]",
      row.whatHappensNext,
      "[]",
      "",
      row.chatbotSummary,
      "[]",
      "billing, stripe, payments",
      row.audience,
      row.slug,
      row.category,
      "[]",
      "[]",
      "[]",
      row.visibility,
      "true",
      "false",
      "false",
      "0",
      "2026-05-31",
    ]);
    const { rows, errors } = parseKnowledgeArticlesCsv(`${header}\n${dataLine}`);
    expect(errors).toHaveLength(0);
    expect(rows[0]?.input.keywords).toEqual(["billing", "stripe", "payments"]);
  });
});
