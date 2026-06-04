import { describe, expect, it } from "vitest";
import { resolveScorecardOptionForSelection } from "@/lib/judging/resolve-scorecard-option";

describe("resolveScorecardOptionForSelection", () => {
  const options = [
    { id: "new-id", label: "Major", pointsDeducted: 5 },
    { id: "other", label: "Minor", pointsDeducted: 2 },
  ];

  it("matches by id", () => {
    expect(
      resolveScorecardOptionForSelection(options, { optionId: "new-id" })?.id,
    ).toBe("new-id");
  });

  it("matches stale id by unique points", () => {
    expect(
      resolveScorecardOptionForSelection(options, {
        optionId: "deleted-id",
        pointsDeducted: 5,
      })?.id,
    ).toBe("new-id");
  });
});
