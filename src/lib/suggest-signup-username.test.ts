import { describe, expect, it } from "vitest";
import { suggestClassicCarUsername } from "@/lib/suggest-signup-username";

describe("suggestClassicCarUsername", () => {
  it("returns a valid username shape", () => {
    for (let i = 0; i < 20; i++) {
      const name = suggestClassicCarUsername();
      expect(name.length).toBeGreaterThanOrEqual(3);
      expect(name.length).toBeLessThanOrEqual(30);
      expect(name).toMatch(/^[a-z0-9_]+$/);
      expect(name).toMatch(/\d/);
    }
  });
});
