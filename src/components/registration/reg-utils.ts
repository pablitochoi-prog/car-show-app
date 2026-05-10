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
