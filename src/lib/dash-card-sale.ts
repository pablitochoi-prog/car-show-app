import { mapWithConcurrency } from "@/lib/map-with-concurrency";
import { vehicleSalePageUrl } from "@/lib/vehicle-entry-code";
import { resolveVehicleSaleQrUrlForDashCard } from "@/lib/vehicle-qr";

/** Bounded concurrency for dash-card sale QR inline generation. */
export const DASH_CARD_SALE_QR_CONCURRENCY = 10;

/** Sidebar label when a vehicle sale listing is active on the dash card. */
export const DASH_CARD_SALE_BADGE_LABEL =
  "Owner Accepting Inquiries on this Vehicle";

export function buildDashCardSaleModel(
  vehicleEntryCode: string,
): {
  badgeLabel: string;
  salePageUrl: string;
  qrImageUrl: string | null;
} {
  return {
    badgeLabel: DASH_CARD_SALE_BADGE_LABEL,
    salePageUrl: vehicleSalePageUrl(vehicleEntryCode),
    qrImageUrl: null,
  };
}

type SaleQrTarget = {
  vehicleEntryCode: string;
  eventId: string;
  storageId: string;
};

export type DashCardSaleQrAttachResult = {
  saleQrEnsuredCount: number;
  saleQrFailureCount: number;
};

/** Attach sale QR images to dash cards — inline SVG only (no R2 upload on print load). */
export async function attachSaleQrsToDashCards(
  targets: SaleQrTarget[],
  applyQr: (vehicleEntryCode: string, qrImageUrl: string) => void,
): Promise<DashCardSaleQrAttachResult> {
  const unique = new Map<string, SaleQrTarget>();
  for (const target of targets) {
    if (!target.vehicleEntryCode.trim()) continue;
    unique.set(target.vehicleEntryCode, target);
  }

  const entries = [...unique.entries()];
  const rows = await mapWithConcurrency(
    entries,
    DASH_CARD_SALE_QR_CONCURRENCY,
    async ([code]): Promise<"ensured" | "failed"> => {
      try {
        const qrImageUrl = await resolveVehicleSaleQrUrlForDashCard(code);
        applyQr(code, qrImageUrl);
        return "ensured";
      } catch (e) {
        console.warn("[dash-card-qr] sale QR ensure failed:", code, e);
        return "failed";
      }
    },
  );

  let saleQrEnsuredCount = 0;
  let saleQrFailureCount = 0;
  for (const outcome of rows) {
    if (outcome === "ensured") saleQrEnsuredCount++;
    else saleQrFailureCount++;
  }

  return { saleQrEnsuredCount, saleQrFailureCount };
}
