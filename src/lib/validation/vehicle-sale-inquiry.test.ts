import { describe, expect, it } from "vitest";
import {
  formatVehicleSaleInquiryBuyerName,
  normalizeInquiryMessage,
  vehicleSaleInquirySchema,
} from "./vehicle-sale-inquiry";

describe("vehicleSaleInquirySchema", () => {
  const validBase = {
    buyerFirstName: "Jane",
    buyerLastName: "Buyer",
    buyerEmail: "buyer@example.com",
    consent: true as const,
    website: "",
  };

  it("requires first and last name", () => {
    const result = vehicleSaleInquirySchema.safeParse({
      ...validBase,
      buyerFirstName: "",
    });
    expect(result.success).toBe(false);
  });

  it("requires consent", () => {
    const result = vehicleSaleInquirySchema.safeParse({
      ...validBase,
      consent: false,
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional phone and offer", () => {
    const result = vehicleSaleInquirySchema.safeParse({
      ...validBase,
      buyerPhone: "(818) 555-0100",
      offerAmountDollars: "$25,000",
      message: "Is this still available?",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative offers", () => {
    const result = vehicleSaleInquirySchema.safeParse({
      ...validBase,
      offerAmountDollars: "-100",
    });
    expect(result.success).toBe(false);
  });

  it("requires phone when SMS opt-in is checked", () => {
    const result = vehicleSaleInquirySchema.safeParse({
      ...validBase,
      smsNotificationsOptIn: true,
    });
    expect(result.success).toBe(false);
  });

  it("accepts SMS opt-in with phone", () => {
    const result = vehicleSaleInquirySchema.safeParse({
      ...validBase,
      buyerPhone: "(818) 555-0100",
      smsNotificationsOptIn: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.smsNotificationsOptIn).toBe(true);
    }
  });
});

describe("normalizeInquiryMessage", () => {
  it("sanitizes rich text and strips scripts", () => {
    const normalized = normalizeInquiryMessage(
      "<ul><li><p>Interested</p></li></ul><script>x</script>",
    );
    expect(normalized).toContain("<ul>");
    expect(normalized).not.toContain("script");
  });

  it("returns null for empty editor output", () => {
    expect(normalizeInquiryMessage("<p></p>")).toBeNull();
    expect(normalizeInquiryMessage("")).toBeNull();
  });
});

describe("formatVehicleSaleInquiryBuyerName", () => {
  it("joins trimmed first and last names", () => {
    expect(
      formatVehicleSaleInquiryBuyerName({
        buyerFirstName: " Jane ",
        buyerLastName: "Buyer ",
      }),
    ).toBe("Jane Buyer");
  });
});
