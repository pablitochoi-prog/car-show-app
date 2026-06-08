import type { PlatformFeePromoCode, PlatformFeePromoCodeStatus } from "@prisma/client";
import { csvRow } from "@/lib/event-reports/csv";
import { formatPromoCodeForDisplay } from "@/lib/promo-codes/promo-code-generator";
import { PROMO_CODE_STATUS_LABELS } from "@/lib/promo-codes/promo-code-status";

export type PromoCodeCsvRow = PlatformFeePromoCode & {
  redeemedBy?: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

export const PROMO_CODE_CSV_HEADERS = [
  "Promo code",
  "Status",
  "Created",
  "Modified",
  "Expires",
  "Organization",
  "Event name",
  "Event state",
  "Redeemed by",
  "Redeemed date/time",
  "Internal notes",
] as const;

function isoOrEmpty(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function redeemedByLabel(row: PromoCodeCsvRow): string {
  if (!row.redeemedBy) return "";
  const name = [row.redeemedBy.firstName, row.redeemedBy.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || row.redeemedBy.email;
}

function orgDisplay(row: PromoCodeCsvRow): string {
  return row.redeemedOrganizationName ?? row.reservedOrganizationName ?? "";
}

function eventNameDisplay(row: PromoCodeCsvRow): string {
  return row.redeemedEventName ?? row.reservedEventName ?? "";
}

function eventStateDisplay(row: PromoCodeCsvRow): string {
  return row.redeemedEventState ?? row.reservedEventState ?? "";
}

export function promoCodeToCsvRow(row: PromoCodeCsvRow): string {
  return csvRow([
    formatPromoCodeForDisplay(row.code),
    PROMO_CODE_STATUS_LABELS[row.status as PlatformFeePromoCodeStatus],
    isoOrEmpty(row.createdAt),
    isoOrEmpty(row.updatedAt),
    isoOrEmpty(row.expiresAt),
    orgDisplay(row),
    eventNameDisplay(row),
    eventStateDisplay(row),
    redeemedByLabel(row),
    isoOrEmpty(row.redeemedAt),
    row.internalNotes ?? "",
  ]);
}

export function buildPromoCodesCsv(rows: PromoCodeCsvRow[]): string {
  const lines = [csvRow([...PROMO_CODE_CSV_HEADERS])];
  for (const row of rows) {
    lines.push(promoCodeToCsvRow(row));
  }
  return `${lines.join("\r\n")}\r\n`;
}
