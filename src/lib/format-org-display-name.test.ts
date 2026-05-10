import { describe, expect, it } from "vitest";
import { formatOrgNameWithClubState } from "./format-org-display-name";

describe("formatOrgNameWithClubState", () => {
  it("appends parenthetical state when set", () => {
    expect(formatOrgNameWithClubState("PCA New Jersey", "NJ")).toBe(
      "PCA New Jersey (NJ)"
    );
  });

  it("returns name only when state missing", () => {
    expect(formatOrgNameWithClubState("PCA New Jersey", null)).toBe(
      "PCA New Jersey"
    );
    expect(formatOrgNameWithClubState("PCA New Jersey", "")).toBe(
      "PCA New Jersey"
    );
  });
});
