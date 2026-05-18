/** Platform convenience fee settings (safe for client + server). */
export type PlatformFeeConfig = {
  type: "NONE" | "FIXED" | "PERCENT";
  amountCents: number | null;
  percent: number | null;
};

export const DEFAULT_PLATFORM_FEE: PlatformFeeConfig = {
  type: "FIXED",
  amountCents: 50,
  percent: null,
};

/** Calculate the application fee in cents for a given registration price. */
export function calculateApplicationFee(
  fee: PlatformFeeConfig,
  priceCents: number,
): number {
  if (fee.type === "FIXED" && fee.amountCents) {
    return fee.amountCents;
  }
  if (fee.type === "PERCENT" && fee.percent) {
    return Math.round((priceCents * fee.percent) / 100);
  }
  return 0;
}

/** Human-readable label for the fee (e.g. "$0.50 per vehicle"). */
export function formatFeeLabel(fee: PlatformFeeConfig): string {
  if (fee.type === "NONE") return "No convenience fee";
  if (fee.type === "FIXED" && fee.amountCents) {
    return `$${(fee.amountCents / 100).toFixed(2)} per vehicle`;
  }
  if (fee.type === "PERCENT" && fee.percent) {
    return `${fee.percent}% per vehicle`;
  }
  return "No convenience fee";
}
