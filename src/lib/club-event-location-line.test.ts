import { describe, expect, it } from "vitest";
import { formatClubEventLocationLine } from "./club-event-location-line";

describe("formatClubEventLocationLine", () => {
  it("joins venue and city/state", () => {
    expect(
      formatClubEventLocationLine({
        venue: "VFW Hall",
        city: "Riverside",
        state: "CA",
      })
    ).toBe("VFW Hall · Riverside, CA");
  });

  it("returns null when empty", () => {
    expect(
      formatClubEventLocationLine({
        venue: "",
        city: "",
        state: "",
      })
    ).toBe(null);
  });
});
