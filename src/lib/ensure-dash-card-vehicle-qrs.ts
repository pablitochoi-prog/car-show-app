import { mapWithConcurrency } from "@/lib/map-with-concurrency";
import { resolveVehicleQrUrlForDashCard } from "@/lib/vehicle-qr";

/** Bounded concurrency for dash-card QR resolution (inline SVG or existing R2 URL). */
export const DASH_CARD_QR_CONCURRENCY = 10;

export type DashCardQrEnsureResult = {
  qrByCode: Map<string, string>;
  qrEnsuredCount: number;
  qrSkippedCount: number;
  qrFailureCount: number;
};

type DashCardQrEnsureOptions = {
  /** Existing persisted vote QR URLs keyed by public vehicle id. */
  prefetchedUrls?: Map<string, string>;
};

type QrEnsureRowResult =
  | { code: string; url: string; outcome: "skipped" | "ensured" }
  | { code: string; outcome: "failed" };

/**
 * QR image URLs for dash cards — reuse persisted R2 URLs when available;
 * otherwise generate inline SVG data URLs (no R2 upload on this path).
 */
export async function ensureVehicleQrsForEntryCodes(
  codes: string[],
  options: DashCardQrEnsureOptions = {},
): Promise<DashCardQrEnsureResult> {
  const out = new Map<string, string>();
  const unique = [...new Set(codes.filter(Boolean))];
  const prefetched = options.prefetchedUrls ?? new Map<string, string>();

  const rows = await mapWithConcurrency(
    unique,
    DASH_CARD_QR_CONCURRENCY,
    async (code): Promise<QrEnsureRowResult> => {
      const existing = prefetched.get(code)?.trim();
      if (existing) {
        return { code, url: existing, outcome: "skipped" };
      }

      try {
        const url = await resolveVehicleQrUrlForDashCard(null, code);
        return { code, url, outcome: "ensured" };
      } catch (e) {
        console.warn("[dash-card-qr] vote QR ensure failed:", code, e);
        return { code, outcome: "failed" };
      }
    },
  );

  let qrEnsuredCount = 0;
  let qrSkippedCount = 0;
  let qrFailureCount = 0;

  for (const row of rows) {
    if (row.outcome === "failed") {
      qrFailureCount++;
      continue;
    }
    out.set(row.code, row.url);
    if (row.outcome === "skipped") qrSkippedCount++;
    else qrEnsuredCount++;
  }

  return { qrByCode: out, qrEnsuredCount, qrSkippedCount, qrFailureCount };
}
