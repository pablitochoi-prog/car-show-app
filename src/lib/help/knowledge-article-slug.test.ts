import { describe, expect, it } from "vitest";
import { nextAvailableKnowledgeSlug } from "./knowledge-article-slug";

describe("nextAvailableKnowledgeSlug", () => {
  it("appends -copy and increments when taken", () => {
    const taken = new Set(["connect-stripe", "connect-stripe-copy"]);
    expect(nextAvailableKnowledgeSlug("connect-stripe", taken)).toBe(
      "connect-stripe-copy-2",
    );
  });
});
