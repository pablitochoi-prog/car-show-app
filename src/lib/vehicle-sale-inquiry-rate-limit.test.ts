import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import {
  VEHICLE_SALE_INQUIRY_RATE_LIMITS,
  checkVehicleSaleInquiryRateLimit,
  vehicleSaleInquiryRateLimitWindowStart,
} from "./vehicle-sale-inquiry-rate-limit";

vi.mock("@/lib/db", () => ({
  prisma: {
    vehicleSaleInquiry: {
      count: vi.fn(),
    },
  },
}));

describe("vehicleSaleInquiryRateLimitWindowStart", () => {
  it("returns one hour before the reference time", () => {
    const now = new Date("2026-05-31T12:00:00.000Z");
    expect(vehicleSaleInquiryRateLimitWindowStart(now).toISOString()).toBe(
      "2026-05-31T11:00:00.000Z",
    );
  });
});

describe("checkVehicleSaleInquiryRateLimit", () => {
  const countMock = vi.mocked(prisma.vehicleSaleInquiry.count);

  afterEach(() => {
    countMock.mockReset();
  });

  it("allows inquiry when all counts are below limits", async () => {
    countMock.mockResolvedValue(0);

    const result = await checkVehicleSaleInquiryRateLimit({
      listingId: "listing-1",
      buyerEmail: "buyer@example.com",
      ipHash: "abc123",
    });

    expect(result).toEqual({ ok: true });
    expect(countMock).toHaveBeenCalledTimes(3);
  });

  it("blocks when listing limit is reached", async () => {
    countMock.mockResolvedValueOnce(
      VEHICLE_SALE_INQUIRY_RATE_LIMITS.perListingPerHour,
    );

    const result = await checkVehicleSaleInquiryRateLimit({
      listingId: "listing-1",
      buyerEmail: "buyer@example.com",
      ipHash: "abc123",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/this vehicle/i);
    }
  });

  it("blocks when email limit is reached", async () => {
    countMock
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(
        VEHICLE_SALE_INQUIRY_RATE_LIMITS.perEmailPerHour,
      );

    const result = await checkVehicleSaleInquiryRateLimit({
      listingId: "listing-1",
      buyerEmail: "buyer@example.com",
      ipHash: "abc123",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/email address/i);
    }
  });

  it("blocks when IP hash limit is reached", async () => {
    countMock
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(VEHICLE_SALE_INQUIRY_RATE_LIMITS.perIpHashPerHour);

    const result = await checkVehicleSaleInquiryRateLimit({
      listingId: "listing-1",
      buyerEmail: "buyer@example.com",
      ipHash: "abc123",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/network/i);
    }
  });

  it("skips IP count when ipHash is missing", async () => {
    countMock.mockResolvedValue(0);

    await checkVehicleSaleInquiryRateLimit({
      listingId: "listing-1",
      buyerEmail: "buyer@example.com",
      ipHash: null,
    });

    expect(countMock).toHaveBeenCalledTimes(2);
  });
});
