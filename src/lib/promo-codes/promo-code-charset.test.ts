import { describe, expect, it } from "vitest";
import {
  isValidPromoCodeFormat,
  normalizePromoCodeInput,
} from "./promo-code-charset";

describe("normalizePromoCodeInput", () => {
  it("trims whitespace and uppercases letters", () => {
    expect(normalizePromoCodeInput("  abcd1234efgh5678  ")).toBe(
      "ABCD1234EFGH5678",
    );
  });

  it("preserves allowed special characters", () => {
    expect(normalizePromoCodeInput("test#car$8m2p4q!")).toBe("TEST#CAR$8M2P4Q!");
  });
});

describe("isValidPromoCodeFormat", () => {
  it("accepts spec examples after normalization", () => {
    expect(isValidPromoCodeFormat("A7K9P2Q4Z8M1X3BN")).toBe(true);
    expect(isValidPromoCodeFormat("CLUB_2026_A7K9P2")).toBe(true);
    expect(isValidPromoCodeFormat("TEST#CAR$8M2P4Q!")).toBe(true);
  });

  it("rejects wrong length or disallowed characters", () => {
    expect(isValidPromoCodeFormat("SHORT")).toBe(false);
    expect(isValidPromoCodeFormat("ABCD1234EFGH567@")).toBe(false);
  });
});
