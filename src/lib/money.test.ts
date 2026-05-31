import { describe, expect, it } from "vitest";
import {
  dollarsToCents,
  formatUsdDollars,
  formatUsdWholeDollars,
  formatWholeDollarInput,
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

  it("formats whole USD with thousands separators", () => {
    expect(formatUsdWholeDollars(25000)).toBe("$25,000");
    expect(formatUsdWholeDollars(25000.6)).toBe("$25,001");
  });

  it("formats whole-dollar input while typing", () => {
    expect(formatWholeDollarInput("25000")).toBe("$25,000");
    expect(formatWholeDollarInput("$25,000")).toBe("$25,000");
    expect(formatWholeDollarInput("")).toBe("");
  });
});
