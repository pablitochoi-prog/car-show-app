import { describe, expect, it } from "vitest";
import {
  applyClubRefundAdjustments,
  clubRefundReductionCents,
} from "./registration-refund-adjustments";

describe("clubRefundReductionCents", () => {
  it("caps reduction at club fee and collected", () => {
    expect(
      clubRefundReductionCents({
        refundedCents: 20_00,
        clubCollectedCents: 50_00,
        clubFeeCents: 50_00,
      }),
    ).toBe(20_00);
  });

  it("does not reduce more than club amounts", () => {
    expect(
      clubRefundReductionCents({
        refundedCents: 60_00,
        clubCollectedCents: 50_00,
        clubFeeCents: 50_00,
      }),
    ).toBe(50_00);
  });
});

describe("applyClubRefundAdjustments", () => {
  it("reduces fee and collected by the same amount", () => {
    expect(
      applyClubRefundAdjustments(50_00, 50_00, 15_00),
    ).toEqual({
      clubFeeCents: 35_00,
      clubCollectedCents: 35_00,
    });
  });
});
