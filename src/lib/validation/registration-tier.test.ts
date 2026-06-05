import { describe, expect, it } from "vitest";
import {
  registrationTierPatchSchema,
  registrationTierWriteSchema,
} from "@/lib/validation/registration";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe("registrationTierPatchSchema", () => {
  it("accepts a future tier window on PATCH", () => {
    const now = Date.now();
    const result = registrationTierPatchSchema.safeParse({
      name: "Early Bird",
      priceCents: 2000,
      opensAt: new Date(now + 30 * MS_PER_DAY).toISOString(),
      closesAt: new Date(now + 60 * MS_PER_DAY).toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("rejects past tier open dates", () => {
    const result = registrationTierPatchSchema.safeParse({
      opensAt: new Date(Date.now() - 365 * MS_PER_DAY).toISOString(),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("open");
    }
  });
});

describe("registrationTierWriteSchema", () => {
  it("does not throw when parsed for create", () => {
    expect(() =>
      registrationTierWriteSchema.safeParse({
        name: "General",
        priceCents: 2500,
      }),
    ).not.toThrow();
  });
});
