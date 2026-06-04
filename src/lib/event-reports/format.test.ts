import { describe, expect, it } from "vitest";
import { applyTopN, REPORT_TOP_N } from "./format";

describe("applyTopN", () => {
  it("limits to REPORT_TOP_N by default", () => {
    const rows = Array.from({ length: 30 }, (_, i) => i);
    expect(applyTopN(rows, false)).toHaveLength(REPORT_TOP_N);
    expect(applyTopN(rows, true)).toHaveLength(30);
  });
});
