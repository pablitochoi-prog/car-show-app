import { describe, expect, it } from "vitest";
import { toStripeE164Phone } from "./phone-us";

describe("toStripeE164Phone", () => {
  it("converts masked US phone to E.164", () => {
    expect(toStripeE164Phone("(818) 271-7227")).toBe("+18182717227");
  });

  it("returns undefined for empty or invalid phone", () => {
    expect(toStripeE164Phone("")).toBeUndefined();
    expect(toStripeE164Phone("(818) 271")).toBeUndefined();
  });
});
