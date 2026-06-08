import { describe, expect, it, vi } from "vitest";
import {
  formatPromoCodeForDisplay,
  generateUniquePromoCode,
  generateUniquePromoCodes,
} from "./promo-code-generator";
import { PROMO_CODE_LENGTH } from "./promo-code-charset";

describe("generateUniquePromoCode", () => {
  it("produces 16-character uppercase alphanumeric codes", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const prisma = { platformFeePromoCode: { findUnique } } as never;

    const code = await generateUniquePromoCode(prisma);
    expect(code).toHaveLength(PROMO_CODE_LENGTH);
    expect(code).toMatch(/^[A-Z0-9]{16}$/);
  });

  it("retries when a generated code collides", async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValueOnce({ id: "existing" })
      .mockResolvedValueOnce(null);
    const prisma = { platformFeePromoCode: { findUnique } } as never;

    const code = await generateUniquePromoCode(prisma);
    expect(findUnique).toHaveBeenCalledTimes(2);
    expect(code).toHaveLength(PROMO_CODE_LENGTH);
  });

  it("throws after max collision attempts", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: "existing" });
    const prisma = { platformFeePromoCode: { findUnique } } as never;

    await expect(generateUniquePromoCode(prisma, 3)).rejects.toThrow(
      /unique promo code/i,
    );
    expect(findUnique).toHaveBeenCalledTimes(3);
  });
});

describe("generateUniquePromoCodes", () => {
  it("returns the requested number of unique codes", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const prisma = { platformFeePromoCode: { findUnique } } as never;

    const codes = await generateUniquePromoCodes(prisma, 10);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    codes.forEach((code) => expect(code).toMatch(/^[A-Z0-9]{16}$/));
  });
});

describe("formatPromoCodeForDisplay", () => {
  it("groups 16 characters with hyphens", () => {
    expect(formatPromoCodeForDisplay("ABCD1234EFGH5678")).toBe(
      "ABCD-1234-EFGH5678",
    );
  });
});
