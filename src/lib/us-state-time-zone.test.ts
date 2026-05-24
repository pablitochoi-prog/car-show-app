import { describe, expect, it } from "vitest";
import { timeZoneForUsState } from "./us-state-time-zone";

describe("timeZoneForUsState", () => {
  it("maps known states", () => {
    expect(timeZoneForUsState("CA")).toBe("America/Los_Angeles");
    expect(timeZoneForUsState("nj")).toBe("America/New_York");
    expect(timeZoneForUsState("HI")).toBe("Pacific/Honolulu");
    expect(timeZoneForUsState("AK")).toBe("America/Anchorage");
  });

  it("defaults when missing or unknown", () => {
    expect(timeZoneForUsState("")).toBe("America/Los_Angeles");
    expect(timeZoneForUsState(null)).toBe("America/Los_Angeles");
    expect(timeZoneForUsState("XX")).toBe("America/Los_Angeles");
  });
});
