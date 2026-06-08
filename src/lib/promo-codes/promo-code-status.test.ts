import { describe, expect, it } from "vitest";
import {
  adminManualStatusTransitionError,
  bulkStatusTransitionError,
  isBulkStatusTransitionAllowed,
  isPromoCodeExpired,
} from "./promo-code-status";

describe("bulk status transitions", () => {
  it("allows approved bulk transitions", () => {
    expect(isBulkStatusTransitionAllowed("DRAFT", "ACTIVE")).toBe(true);
    expect(isBulkStatusTransitionAllowed("ACTIVE", "REVOKED")).toBe(true);
    expect(isBulkStatusTransitionAllowed("ACTIVE", "ARCHIVED")).toBe(true);
    expect(isBulkStatusTransitionAllowed("REVOKED", "ACTIVE")).toBe(true);
    expect(isBulkStatusTransitionAllowed("DRAFT", "ARCHIVED")).toBe(true);
    expect(isBulkStatusTransitionAllowed("ACTIVE", "EXPIRED")).toBe(true);
    expect(isBulkStatusTransitionAllowed("DRAFT", "EXPIRED")).toBe(true);
    expect(isBulkStatusTransitionAllowed("REVOKED", "EXPIRED")).toBe(true);
    expect(isBulkStatusTransitionAllowed("RESERVED", "EXPIRED")).toBe(true);
    expect(isBulkStatusTransitionAllowed("EXPIRED", "ARCHIVED")).toBe(true);
    expect(isBulkStatusTransitionAllowed("EXPIRED", "ACTIVE")).toBe(true);
  });

  it("rejects REDEEMED → ACTIVE", () => {
    expect(bulkStatusTransitionError("REDEEMED", "ACTIVE")).toMatch(
      /cannot be reactivated/i,
    );
  });

  it("rejects ARCHIVED → ACTIVE via bulk", () => {
    expect(bulkStatusTransitionError("ARCHIVED", "ACTIVE")).toMatch(
      /cannot be bulk-activated/i,
    );
  });

  it("allows REDEEMED → ARCHIVED", () => {
    expect(isBulkStatusTransitionAllowed("REDEEMED", "ARCHIVED")).toBe(true);
  });
});

describe("admin manual status transitions", () => {
  it("allows ACTIVE → EXPIRED", () => {
    expect(adminManualStatusTransitionError("ACTIVE", "EXPIRED")).toBeNull();
  });

  it("allows EXPIRED → ACTIVE", () => {
    expect(adminManualStatusTransitionError("EXPIRED", "ACTIVE")).toBeNull();
  });

  it("allows DRAFT → EXPIRED", () => {
    expect(adminManualStatusTransitionError("DRAFT", "EXPIRED")).toBeNull();
  });

  it("blocks REDEEMED → EXPIRED", () => {
    expect(adminManualStatusTransitionError("REDEEMED", "EXPIRED")).toMatch(
      /only be archived/i,
    );
  });
});

describe("isPromoCodeExpired", () => {
  it("returns true when expiresAt is in the past", () => {
    expect(isPromoCodeExpired(new Date("2020-01-01"))).toBe(true);
  });

  it("returns false when expiresAt is null or future", () => {
    expect(isPromoCodeExpired(null)).toBe(false);
    expect(isPromoCodeExpired(new Date("2099-01-01"))).toBe(false);
  });
});
