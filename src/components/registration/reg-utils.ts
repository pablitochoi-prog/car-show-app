export function isTierOpen(tier: { opensAt: string | null; closesAt: string | null }): boolean {
  const now = new Date();
  if (tier.opensAt && now < new Date(tier.opensAt)) return false;
  if (tier.closesAt && now > new Date(tier.closesAt)) return false;
  return true;
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export type ConvFeeInput = {
  type: "NONE" | "FIXED" | "PERCENT";
  amountCents: number | null;
  percent: number | null;
} | null;

/** Per-vehicle convenience fee in cents (fixed or percent of tier unit price). */
export function convenienceFeePerVehicle(
  fee: ConvFeeInput,
  tierUnitCents: number,
): number {
  if (!fee || fee.type === "NONE") return 0;
  if (fee.type === "FIXED" && fee.amountCents) return fee.amountCents;
  if (fee.type === "PERCENT" && fee.percent) {
    return Math.round((tierUnitCents * fee.percent) / 100);
  }
  return 0;
}
