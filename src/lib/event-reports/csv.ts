/** Shared CSV escaping for event report exports. */
export function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function csvRow(values: (string | number | null | undefined)[]): string {
  return values
    .map((v) => csvEscape(v == null || v === "" ? "" : String(v)))
    .join(",");
}
