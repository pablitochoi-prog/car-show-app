import { describe, expect, it } from "vitest";
import { formatKnowledgeArticleNumber } from "./knowledge-article-number";

describe("formatKnowledgeArticleNumber", () => {
  it("formats with KA prefix and zero padding", () => {
    expect(formatKnowledgeArticleNumber(1)).toBe("KA-00001");
    expect(formatKnowledgeArticleNumber(42)).toBe("KA-00042");
    expect(formatKnowledgeArticleNumber(123456)).toBe("KA-123456");
  });
});
