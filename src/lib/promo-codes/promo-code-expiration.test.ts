import { describe, expect, it } from "vitest";
import {
  activePromoCodeExpiresAt,
  resolvePromoCodeExpiresAtUpdate,
} from "./promo-code-expiration";

describe("promo code expiration on activate", () => {
  const now = new Date("2026-06-08T12:00:00.000Z");

  it("sets expiration 90 days ahead when becoming ACTIVE", () => {
    const expiresAt = resolvePromoCodeExpiresAtUpdate({
      previousStatus: "DRAFT",
      nextStatus: "ACTIVE",
      explicitExpiresAt: undefined,
      now,
    });
    expect(expiresAt).toEqual(activePromoCodeExpiresAt(now));
    expect(expiresAt?.getTime()).toBe(
      new Date("2026-09-06T12:00:00.000Z").getTime(),
    );
  });

  it("does not change expiration when ACTIVE already has one", () => {
    expect(
      resolvePromoCodeExpiresAtUpdate({
        previousStatus: "ACTIVE",
        nextStatus: "ACTIVE",
        explicitExpiresAt: undefined,
        currentExpiresAt: new Date("2026-12-01T00:00:00.000Z"),
        now,
      }),
    ).toBeUndefined();
  });

  it("honors explicit expiresAt on activate", () => {
    const custom = "2026-12-31T00:00:00.000Z";
    expect(
      resolvePromoCodeExpiresAtUpdate({
        previousStatus: "DRAFT",
        nextStatus: "ACTIVE",
        explicitExpiresAt: custom,
        now,
      }),
    ).toEqual(new Date(custom));
  });

  it("fills missing expiration when already ACTIVE", () => {
    expect(
      resolvePromoCodeExpiresAtUpdate({
        previousStatus: "ACTIVE",
        nextStatus: "ACTIVE",
        explicitExpiresAt: undefined,
        currentExpiresAt: null,
        now,
      }),
    ).toEqual(activePromoCodeExpiresAt(now));
  });

  it("resets expiration 90 days ahead when reactivating EXPIRED → ACTIVE", () => {
    expect(
      resolvePromoCodeExpiresAtUpdate({
        previousStatus: "EXPIRED",
        nextStatus: "ACTIVE",
        explicitExpiresAt: undefined,
        currentExpiresAt: new Date("2026-01-01T00:00:00.000Z"),
        now,
      }),
    ).toEqual(activePromoCodeExpiresAt(now));
  });

  it("sets expiration to now when status becomes EXPIRED", () => {
    expect(
      resolvePromoCodeExpiresAtUpdate({
        previousStatus: "ACTIVE",
        nextStatus: "EXPIRED",
        explicitExpiresAt: undefined,
        now,
      }),
    ).toEqual(now);
  });

  it("keeps existing expiration when already ACTIVE", () => {
    const existing = new Date("2026-12-01T00:00:00.000Z");
    expect(
      resolvePromoCodeExpiresAtUpdate({
        previousStatus: "ACTIVE",
        nextStatus: "ACTIVE",
        explicitExpiresAt: undefined,
        currentExpiresAt: existing,
        now,
      }),
    ).toBeUndefined();
  });
});
