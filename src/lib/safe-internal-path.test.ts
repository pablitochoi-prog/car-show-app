import { describe, expect, it } from "vitest";
import { safeInternalPath } from "./safe-internal-path";

describe("safeInternalPath", () => {
  it("allows internal paths", () => {
    expect(safeInternalPath("/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("/organizer/events/x/edit")).toBe(
      "/organizer/events/x/edit"
    );
  });

  it("rejects open redirects and invalid input", () => {
    expect(safeInternalPath("//evil.com")).toBe(null);
    expect(safeInternalPath("https://x")).toBe(null);
    expect(safeInternalPath(null)).toBe(null);
    expect(safeInternalPath("")).toBe(null);
  });
});
