export function isTierCurrentlyOpen(
  tier: { opensAt: Date | null; closesAt: Date | null },
  now: Date = new Date()
): boolean {
  if (tier.opensAt && now < tier.opensAt) return false;
  if (tier.closesAt && now > tier.closesAt) return false;
  return true;
}
