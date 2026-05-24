import { describe, expect, it } from "vitest";
import {
  formatDonationDollarsFromCents,
  parseDonationDollarsInput,
  suggestedDonationDollarsInput,
} from "./donation";

describe("donation helpers", () => {
  it("parses dollar input to cents", () => {
    expect(parseDonationDollarsInput("25.50")).toBe(2550);
    expect(parseDonationDollarsInput("")).toBeNull();
  });

  it("formats suggested donation total from per-vehicle rate", () => {
    expect(suggestedDonationDollarsInput(25, 1)).toBe("25.00");
    expect(suggestedDonationDollarsInput(25.5, 1)).toBe("25.50");
    expect(suggestedDonationDollarsInput(25, 2)).toBe("50.00");
    expect(suggestedDonationDollarsInput(null)).toBe("");
  });

  it("formats cents for form prefill", () => {
    expect(formatDonationDollarsFromCents(2050)).toBe("20.50");
  });
});
