/** Format integer cents as USD (safe for server + client). */
export function formatMoney(cents: number): string {
  const value = Number(cents);
  if (!Number.isFinite(value)) return "$0.00";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(value / 100);
}
