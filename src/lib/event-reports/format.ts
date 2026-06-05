export function formatReportGeneratedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatCents(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export const REPORT_TOP_N = 25;

export function applyTopN<T>(rows: T[], showAll: boolean): T[] {
  if (showAll) return rows;
  return rows.slice(0, REPORT_TOP_N);
}
