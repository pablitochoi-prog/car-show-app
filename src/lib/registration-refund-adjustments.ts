/** How much of a refund reduces club fee / collected columns (excludes platform portion when capped). */
export function clubRefundReductionCents(input: {
  refundedCents: number;
  clubCollectedCents: number;
  clubFeeCents: number;
}): number {
  const refunded = Math.max(0, input.refundedCents);
  if (refunded <= 0) return 0;
  return Math.min(refunded, input.clubCollectedCents, input.clubFeeCents);
}

export function applyClubRefundAdjustments(
  clubFeeCents: number,
  clubCollectedCents: number,
  refundedCents: number,
): { clubFeeCents: number; clubCollectedCents: number } {
  const reduction = clubRefundReductionCents({
    refundedCents,
    clubCollectedCents,
    clubFeeCents,
  });
  return {
    clubFeeCents: Math.max(0, clubFeeCents - reduction),
    clubCollectedCents: Math.max(0, clubCollectedCents - reduction),
  };
}
