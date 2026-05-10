import { describe, expect, it } from "vitest";
import { sortRolesForDisplay } from "./event-role-labels";

describe("sortRolesForDisplay", () => {
  it("orders roles consistently and dedupes", () => {
    expect(
      sortRolesForDisplay(["JUDGE", "ORGANIZER", "ORGANIZER", "MARKETING"])
    ).toEqual(["ORGANIZER", "JUDGE", "MARKETING"]);
  });

  it("handles arbitrary order input", () => {
    expect(
      sortRolesForDisplay(["MARKETING", "REGISTRAR", "TREASURER"])
    ).toEqual(["REGISTRAR", "TREASURER", "MARKETING"]);
  });
});
