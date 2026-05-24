import { describe, expect, it } from "vitest";
import {
  dollarsToCents,
  formatUsdDollars,
  parseCurrencyDollarsInput,
  roundDollars,
} from "@/lib/money";

describe("money", () => {
  it("converts dollars to cents with rounding", () => {
    expect(dollarsToCents(26.5)).toBe(2650);
    expect(dollarsToCents(26.505)).toBe(2651);
  });

  it("rounds dollars to two decimal places", () => {
    expect(roundDollars(26.505)).toBe(26.51);
  });

  it("parses currency input with cents", () => {
    expect(parseCurrencyDollarsInput("26.50")).toBe(26.5);
    expect(parseCurrencyDollarsInput("$26.50")).toBe(26.5);
    expect(parseCurrencyDollarsInput("")).toBeNull();
  });

  it("formats USD with two decimals", () => {
    expect(formatUsdDollars(26.5)).toBe("$26.50");
  });
});
