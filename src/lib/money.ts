/** Round to two decimal places (USD dollars). */
export function roundDollars(dollars: number): number {
  return Math.round(dollars * 100) / 100;
}

/** Convert dollar amount to integer cents for Stripe and tier prices. */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function formatUsdDollars(dollars: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/** Parse a currency text field to dollars (max 2 decimal places), or null if empty. */
export function parseCurrencyDollarsInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/^\$/, "");
  if (trimmed === "" || trimmed === ".") return null;

  let normalized = trimmed.replace(/[^\d.]/g, "");
  const parts = normalized.split(".");
  if (parts.length > 2) return null;
  if (parts[1] != null) {
    parts[1] = parts[1].slice(0, 2);
    normalized = parts[1] === "" ? parts[0]! : `${parts[0]}.${parts[1]}`;
  }

  if (normalized === "" || normalized === ".") return null;
  const dollars = Number(normalized);
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  return roundDollars(dollars);
}
