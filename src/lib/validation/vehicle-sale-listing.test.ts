import { describe, expect, it } from "vitest";
import {
  normalizeVehicleSaleListingInput,
  parseListingPriceCents,
  vehicleSaleListingInputSchema,
} from "./vehicle-sale-listing";

describe("vehicleSaleListingInputSchema", () => {
  it("accepts disabled listing without acknowledgment", () => {
    const result = vehicleSaleListingInputSchema.safeParse({
      enabled: false,
    });
    expect(result.success).toBe(true);
  });

  it("requires seller acknowledgment when enabled", () => {
    const result = vehicleSaleListingInputSchema.safeParse({
      enabled: true,
      sellerAcknowledged: false,
    });
    expect(result.success).toBe(false);
  });

  it("accepts enabled listing with acknowledgment and price", () => {
    const result = vehicleSaleListingInputSchema.safeParse({
      enabled: true,
      sellerAcknowledged: true,
      askingPriceDollars: "12500.50",
      allowOffers: true,
      minimumOfferDollars: "10000",
    });
    expect(result.success).toBe(true);
  });
});

describe("parseListingPriceCents", () => {
  it("parses dollar strings as whole dollars", () => {
    expect(parseListingPriceCents("$25,000")).toBe(2_500_000);
    expect(parseListingPriceCents("$1,234.56")).toBe(123_500);
  });

  it("returns null for empty values", () => {
    expect(parseListingPriceCents("")).toBeNull();
    expect(parseListingPriceCents(null)).toBeNull();
  });
});

describe("normalizeVehicleSaleListingInput", () => {
  it("stores seller acknowledgment timestamp when enabled", () => {
    const normalized = normalizeVehicleSaleListingInput({
      enabled: true,
      sellerAcknowledged: true,
      askingPriceDollars: "$25,000",
    });
    expect(normalized.enabled).toBe(true);
    expect(normalized.sellerAcknowledgedAt).toBeInstanceOf(Date);
    expect(normalized.askingPriceCents).toBe(2_500_000);
  });

  it("clears acknowledgment when disabled", () => {
    const normalized = normalizeVehicleSaleListingInput({
      enabled: false,
      sellerAcknowledged: false,
    });
    expect(normalized.enabled).toBe(false);
    expect(normalized.sellerAcknowledgedAt).toBeNull();
  });

  it("sanitizes rich text descriptions on save", () => {
    const normalized = normalizeVehicleSaleListingInput({
      enabled: true,
      sellerAcknowledged: true,
      description:
        '<p><strong>Clean</strong><script>alert(1)</script></p>',
    });
    expect(normalized.description).toContain("<strong>Clean</strong>");
    expect(normalized.description).not.toContain("script");
  });
});
