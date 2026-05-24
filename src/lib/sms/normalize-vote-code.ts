import { isValidPublicVehicleId } from "@/lib/event-sms-vehicle-id";
import type { ParsedSmsBody } from "@/lib/sms/types";

const COMPACT_VEHICLE_REGEX = /^([A-HJ-NP-Z]{3})(\d{3})$/;

/** Convert messy SMS text into canonical vehicle entry code (e.g. AXY-004). */
export function normalizeVehicleEntryCodeFromSms(raw: string): string | null {
  let text = raw.trim().toUpperCase();
  if (!text) return null;

  text = text.replace(/^VOTE\s+/i, "").trim();

  if (isValidPublicVehicleId(text)) {
    return text.toUpperCase();
  }

  const compact = text.replace(/[\s-]/g, "");
  const match = compact.match(COMPACT_VEHICLE_REGEX);
  if (match) {
    const code = `${match[1]}-${match[2]}`;
    if (isValidPublicVehicleId(code)) return code;
  }

  return null;
}

export function parseCategoryOptionNumber(raw: string): number | null {
  const t = raw.trim();
  if (!/^[1-3]$/.test(t)) return null;
  return Number.parseInt(t, 10);
}

/** Classify inbound SMS body as vehicle code, category number, or invalid. */
export function parseInboundSmsBody(body: string): ParsedSmsBody {
  const trimmed = body.trim();
  if (!trimmed) return { kind: "invalid" };

  const category = parseCategoryOptionNumber(trimmed);
  if (category != null) {
    return { kind: "category_number", optionNumber: category };
  }

  const code = normalizeVehicleEntryCodeFromSms(trimmed);
  if (code) {
    return { kind: "vehicle_code", code };
  }

  return { kind: "invalid" };
}
