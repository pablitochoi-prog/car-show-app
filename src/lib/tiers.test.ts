import { describe, expect, it } from "vitest";
import { isTierCurrentlyOpen, resolvePayableTier } from "./tiers";

const earlyBird = {
  id: "early",
  name: "Early Bird",
  priceCents: 1500,
  opensAt: "2026-01-01T00:00:00.000Z",
  closesAt: "2026-02-01T00:00:00.000Z",
  sortOrder: 0,
};

const regular = {
  id: "regular",
  name: "Regular",
  priceCents: 2500,
  opensAt: "2026-02-01T00:00:00.000Z",
  closesAt: null,
  sortOrder: 1,
};

describe("resolvePayableTier", () => {
  it("uses preferred tier when still open", () => {
    const now = new Date("2026-01-15T12:00:00.000Z");
    const result = resolvePayableTier([earlyBird, regular], "early", now);
    expect(result?.tier.id).toBe("early");
    expect(result?.tierChanged).toBe(false);
  });

  it("switches to current open tier when preferred tier has ended", () => {
    const now = new Date("2026-03-01T12:00:00.000Z");
    const result = resolvePayableTier([earlyBird, regular], "early", now);
    expect(result?.tier.id).toBe("regular");
    expect(result?.tierChanged).toBe(true);
  });

  it("returns null when no tier is open", () => {
    const now = new Date("2025-12-01T12:00:00.000Z");
    expect(resolvePayableTier([earlyBird, regular], "early", now)).toBeNull();
  });
});

describe("isTierCurrentlyOpen", () => {
  it("respects closesAt", () => {
    const now = new Date("2026-03-01T12:00:00.000Z");
    expect(isTierCurrentlyOpen(earlyBird, now)).toBe(false);
    expect(isTierCurrentlyOpen(regular, now)).toBe(true);
  });
});
