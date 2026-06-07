import { describe, expect, it } from "vitest";
import {
  applyTopN,
  formatCents,
  formatReportGeneratedAt,
  REPORT_TOP_N,
} from "./format";

describe("applyTopN", () => {
  it("limits to REPORT_TOP_N by default", () => {
    const rows = Array.from({ length: 30 }, (_, i) => i);
    expect(applyTopN(rows, false)).toHaveLength(REPORT_TOP_N);
    expect(applyTopN(rows, true)).toHaveLength(30);
  });

  it("returns empty array unchanged", () => {
    expect(applyTopN([], false)).toEqual([]);
  });
});

describe("formatCents", () => {
  it("formats USD from integer cents", () => {
    expect(formatCents(2500)).toMatch(/\$25\.00/);
  });

  it("returns em dash for nullish values", () => {
    expect(formatCents(null)).toBe("—");
    expect(formatCents(undefined)).toBe("—");
  });
});

describe("formatReportGeneratedAt", () => {
  it("formats a valid ISO timestamp", () => {
    const out = formatReportGeneratedAt("2026-06-01T15:30:00.000Z");
    expect(out.length).toBeGreaterThan(0);
  });

  it("returns empty string for invalid input", () => {
    expect(formatReportGeneratedAt("not-a-date")).toBe("");
  });
});
