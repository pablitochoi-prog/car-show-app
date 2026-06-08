import { describe, expect, it, vi } from "vitest";
import { redeemPlatformFeePromoCode } from "./promo-code-redeem";

const CODE = "ABCD1234EFGH5678";
const EVENT_ID = "event-1";
const USER_ID = "user-1";
const PROMO_ID = "promo-1";

function buildMocks(overrides: {
  event?: Record<string, unknown> | null;
  promo?: Record<string, unknown> | null;
  updateManyCount?: number;
}) {
  const eventUpdate = vi.fn().mockResolvedValue({});
  const updateMany = vi
    .fn()
    .mockResolvedValue({ count: overrides.updateManyCount ?? 1 });

  const tx = {
    event: {
      findUnique: vi.fn().mockResolvedValue(overrides.event ?? null),
      update: eventUpdate,
    },
    platformFeePromoCode: {
      findUnique: vi.fn().mockResolvedValue(overrides.promo ?? null),
      updateMany: updateMany,
    },
  };

  const prisma = {
    $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };

  return { prisma, tx, eventUpdate, updateMany };
}

function activePromo() {
  return {
    id: PROMO_ID,
    code: CODE,
    status: "ACTIVE",
    expiresAt: null,
    redeemedAt: null,
    redeemedEventId: null,
  };
}

function flatEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: EVENT_ID,
    name: "Spring Show",
    state: "NJ",
    platformFeeMode: "FLAT_EVENT",
    platformSetupFeeCollected: false,
    platformFeePromoCodeId: null,
    organization: { name: "Test Club", stripeChargesEnabled: true },
    ...overrides,
  };
}

describe("redeemPlatformFeePromoCode", () => {
  it("normalizes lowercase input to uppercase for lookup", async () => {
    const { prisma, tx } = buildMocks({
      event: flatEvent(),
      promo: activePromo(),
    });

    const result = await redeemPlatformFeePromoCode(prisma as never, {
      eventId: EVENT_ID,
      rawCode: "abcd1234efgh5678",
      userId: USER_ID,
    });

    expect(result.ok).toBe(true);
    expect(tx.platformFeePromoCode.findUnique).toHaveBeenCalledWith({
      where: { code: CODE },
    });
  });

  it("redeems an ACTIVE code once and updates the event", async () => {
    const { prisma, eventUpdate, updateMany } = buildMocks({
      event: flatEvent(),
      promo: activePromo(),
    });

    const result = await redeemPlatformFeePromoCode(prisma as never, {
      eventId: EVENT_ID,
      rawCode: CODE,
      userId: USER_ID,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.promoCodeId).toBe(PROMO_ID);
      expect(result.codeLast4).toBe("5678");
    }
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "ACTIVE", redeemedAt: null }),
        data: expect.objectContaining({
          status: "REDEEMED",
          redeemedByUserId: USER_ID,
          redeemedEventId: EVENT_ID,
        }),
      }),
    );
    expect(eventUpdate).toHaveBeenCalledWith({
      where: { id: EVENT_ID },
      data: {
        platformSetupFeeCollected: true,
        platformFeePromoCodeId: PROMO_ID,
        paymentEnabled: true,
      },
    });
  });

  it("rejects REDEEMED codes", async () => {
    const { prisma } = buildMocks({
      event: flatEvent(),
      promo: {
        ...activePromo(),
        status: "REDEEMED",
        redeemedAt: new Date(),
      },
    });

    const result = await redeemPlatformFeePromoCode(prisma as never, {
      eventId: EVENT_ID,
      rawCode: CODE,
      userId: USER_ID,
    });
    expect(result.ok).toBe(false);
  });

  it.each(["DRAFT", "RESERVED", "EXPIRED", "REVOKED", "ARCHIVED"] as const)(
    "rejects %s codes",
    async (status) => {
      const { prisma } = buildMocks({
        event: flatEvent(),
        promo: { ...activePromo(), status },
      });

      const result = await redeemPlatformFeePromoCode(prisma as never, {
        eventId: EVENT_ID,
        rawCode: CODE,
        userId: USER_ID,
      });
      expect(result.ok).toBe(false);
    },
  );

  it("rejects when event uses CONVENIENCE fee mode", async () => {
    const { prisma } = buildMocks({
      event: flatEvent({ platformFeeMode: "CONVENIENCE" }),
      promo: activePromo(),
    });

    const result = await redeemPlatformFeePromoCode(prisma as never, {
      eventId: EVENT_ID,
      rawCode: CODE,
      userId: USER_ID,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects expired ACTIVE codes by effective status", async () => {
    const { prisma } = buildMocks({
      event: flatEvent(),
      promo: {
        ...activePromo(),
        expiresAt: new Date("2020-01-01"),
      },
    });

    const result = await redeemPlatformFeePromoCode(prisma as never, {
      eventId: EVENT_ID,
      rawCode: CODE,
      userId: USER_ID,
    });
    expect(result.ok).toBe(false);
  });

  it("fails when concurrent updateMany affects zero rows", async () => {
    const { prisma } = buildMocks({
      event: flatEvent(),
      promo: activePromo(),
      updateManyCount: 0,
    });

    const result = await redeemPlatformFeePromoCode(prisma as never, {
      eventId: EVENT_ID,
      rawCode: CODE,
      userId: USER_ID,
    });
    expect(result.ok).toBe(false);
  });
});
