import { describe, expect, it } from "vitest";
import { formatSubmittedAt } from "./format-submitted-at";

describe("formatSubmittedAt", () => {
  it("formats with explicit parts (no dateStyle/timeStyle)", () => {
    const label = formatSubmittedAt("2026-05-31T23:06:00.000Z");
    expect(label).toMatch(/May 31, 2026/);
    expect(label).toMatch(/PM|AM/);
    expect(label).not.toMatch(/ at /);
  });
});
