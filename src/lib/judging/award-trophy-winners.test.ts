import { describe, expect, it } from "vitest";
import { normalizeAwardNameForMatch } from "@/lib/judging/award-trophy-match";
import { pickAutoWinnerForPlace } from "@/lib/judging/award-trophy-place-pick";
import { TROPHY_WINNERS_LIST_SIZE } from "@/lib/judging/award-trophy-match";

describe("award trophy helpers", () => {
  it("normalizes award names for matching", () => {
    expect(normalizeAwardNameForMatch("  Best   Paint  ")).toBe("best paint");
  });

  it("exposes top-10 list size constant", () => {
    expect(TROPHY_WINNERS_LIST_SIZE).toBe(10);
  });

  it("picks by place index in score order", () => {
    const pool = [
      { vehicleEntryCode: "V-001" },
      { vehicleEntryCode: "V-002" },
    ];
    expect(pickAutoWinnerForPlace(pool, 0, new Set())).toBe("V-001");
    expect(pickAutoWinnerForPlace(pool, 1, new Set())).toBe("V-002");
  });

  it("skips excluded vehicles and promotes alternates", () => {
    const pool = [
      { vehicleEntryCode: "V-001" },
      { vehicleEntryCode: "V-002" },
      { vehicleEntryCode: "V-003" },
    ];
    const excluded = new Set(["V-001"]);
    expect(pickAutoWinnerForPlace(pool, 0, excluded)).toBe("V-002");
    expect(pickAutoWinnerForPlace(pool, 1, excluded)).toBe("V-003");
  });
});
