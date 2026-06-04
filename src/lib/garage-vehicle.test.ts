import { describe, expect, it } from "vitest";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("garage vehicle id routing", () => {
  it("treats UUIDs as garage vehicle ids", () => {
    expect(UUID_RE.test("4b408416-5e88-4e6c-b8a7-35e2fdd16cd7")).toBe(true);
  });

  it("treats show entry codes as non-UUID params", () => {
    expect(UUID_RE.test("AXY-004")).toBe(false);
  });
});
