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

/** Numeric USD amount without a currency symbol (for use beside a $ icon). */
export function formatUsdDollarsAmount(dollars: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/** USD currency with thousands separators and no decimal places. */
export function formatUsdWholeDollars(dollars: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(dollars));
}

/** Format a whole-dollar field while the user types (digits only → $25,000). */
export function formatWholeDollarInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  const dollars = Number(digits);
  if (!Number.isFinite(dollars)) return "";
  return formatUsdWholeDollars(dollars);
}

/** Whole-dollar cents → display string for form fields. */
export function centsToWholeDollarInput(cents: number): string {
  return formatUsdWholeDollars(cents / 100);
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
