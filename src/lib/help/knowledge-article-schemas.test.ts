import { describe, expect, it } from "vitest";
import {
  knowledgeArticleCreateSchema,
  parseFaqsJson,
  parseStepsJson,
} from "./knowledge-article-schemas";

describe("knowledge article schemas", () => {
  it("parses valid steps JSON", () => {
    const steps = parseStepsJson(
      '[{"title":"One","body":"First step"}]',
    );
    expect(steps).toHaveLength(1);
    expect(steps[0]?.title).toBe("One");
  });

  it("rejects invalid steps JSON", () => {
    expect(() => parseStepsJson("[{bad json}]")).toThrow(/valid JSON/);
    expect(() => parseStepsJson('[{"title":""}]')).toThrow(/invalid/i);
  });

  it("parses valid FAQ JSON", () => {
    const faqs = parseFaqsJson(
      '[{"question":"Q?","answer":"A."}]',
    );
    expect(faqs).toHaveLength(1);
  });

  it("rejects invalid audience and duplicate slug validation via schema", () => {
    const result = knowledgeArticleCreateSchema.safeParse({
      title: "Test",
      slug: "valid-slug",
      shortDescription: "Desc",
      audience: "NOT_REAL",
      category: "getting-started",
      visibility: "public",
      published: true,
      featured: false,
      popular: false,
      sortOrder: 1,
      keywords: [],
      relatedWebsitePages: [],
      relatedFeatures: [],
      relatedArticleIds: [],
      whoThisIsFor: "Who",
      whatThisHelpsYouDo: "What",
      beforeYouStart: [],
      stepByStepInstructions: [{ title: "S", body: "B" }],
      whatHappensNext: "Next",
      frequentlyAskedQuestions: [],
      articleBody: "",
      chatbotSummary: "Summary",
      chatbotKeywords: [],
      lastReviewedAt: "2026-05-31",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid article payload", () => {
    const result = knowledgeArticleCreateSchema.safeParse({
      title: "Test",
      slug: "valid-slug",
      shortDescription: "Desc",
      audience: "ORGANIZER",
      category: "event-setup",
      visibility: "public",
      published: true,
      featured: false,
      popular: false,
      sortOrder: 1,
      keywords: ["help"],
      relatedWebsitePages: ["/help"],
      relatedFeatures: [],
      relatedArticleIds: [],
      whoThisIsFor: "Who",
      whatThisHelpsYouDo: "What",
      beforeYouStart: [],
      stepByStepInstructions: [{ title: "S", body: "B" }],
      whatHappensNext: "Next",
      frequentlyAskedQuestions: [],
      articleBody: "",
      chatbotSummary: "Summary",
      chatbotKeywords: [],
      lastReviewedAt: "2026-05-31",
    });
    expect(result.success).toBe(true);
  });
});
