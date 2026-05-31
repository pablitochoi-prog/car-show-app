import { describe, expect, it } from "vitest";
import { hashSaleInquiryClientValue } from "./vehicle-sale-inquiry-client-hash";

describe("hashSaleInquiryClientValue", () => {
  it("returns a 32-character hex digest", () => {
    const hash = hashSaleInquiryClientValue("203.0.113.10");
    expect(hash).toMatch(/^[a-f0-9]{32}$/);
  });

  it("is stable for the same input", () => {
    expect(hashSaleInquiryClientValue("same-value")).toBe(
      hashSaleInquiryClientValue("same-value"),
    );
  });

  it("does not equal the raw input", () => {
    const raw = "203.0.113.10";
    expect(hashSaleInquiryClientValue(raw)).not.toBe(raw);
  });
});
