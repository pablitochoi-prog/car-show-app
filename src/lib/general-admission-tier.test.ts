import { describe, expect, it } from "vitest";
import {
  generalAdmissionPriceCents,
  usesGeneralAdmissionTier,
} from "./general-admission-tier";

describe("general admission tier helpers", () => {
  it("identifies simple fee types", () => {
    expect(usesGeneralAdmissionTier("FREE")).toBe(true);
    expect(usesGeneralAdmissionTier("PAID")).toBe(true);
    expect(usesGeneralAdmissionTier("DONATION")).toBe(true);
    expect(usesGeneralAdmissionTier("PAID_TIERED")).toBe(false);
  });

  it("computes flat rate price in cents", () => {
    expect(generalAdmissionPriceCents("PAID", 25)).toBe(2500);
    expect(generalAdmissionPriceCents("FREE", null)).toBe(0);
    expect(generalAdmissionPriceCents("DONATION", 10)).toBe(0);
  });
});
