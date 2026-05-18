type TierDateInput = Date | string | null | undefined;

function tierDate(value: TierDateInput): Date | null {
  if (value == null) return null;
  return value instanceof Date ? value : new Date(value);
}

export function isTierCurrentlyOpen(
  tier: { opensAt: TierDateInput; closesAt: TierDateInput },
  now: Date = new Date(),
): boolean {
  const opensAt = tierDate(tier.opensAt);
  const closesAt = tierDate(tier.closesAt);
  if (opensAt && now < opensAt) return false;
  if (closesAt && now > closesAt) return false;
  return true;
}

export type TierForPricing = {
  id: string;
  name: string;
  priceCents: number;
  opensAt: TierDateInput;
  closesAt: TierDateInput;
  sortOrder?: number;
};

export type ResolvedPayableTier<T extends TierForPricing> = {
  tier: T;
  /** True when the payable tier differs from the registrant's stored selection. */
  tierChanged: boolean;
};

/**
 * Tier used at payment time: preferred tier if still open, otherwise the first
 * open tier for the event (by sort order).
 */
export function resolvePayableTier<T extends TierForPricing>(
  tiers: T[],
  preferredTierId?: string | null,
  now: Date = new Date(),
): ResolvedPayableTier<T> | null {
  const sorted = [...tiers].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
  );
  const openTiers = sorted.filter((t) => isTierCurrentlyOpen(t, now));
  if (openTiers.length === 0) return null;

  if (preferredTierId) {
    const preferred = sorted.find((t) => t.id === preferredTierId);
    if (preferred && isTierCurrentlyOpen(preferred, now)) {
      return { tier: preferred, tierChanged: false };
    }
  }

  const payable = openTiers[0]!;
  return {
    tier: payable,
    tierChanged: !!preferredTierId && preferredTierId !== payable.id,
  };
}
