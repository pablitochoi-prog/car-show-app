import { vehicleSalePageUrl } from "@/lib/vehicle-entry-code";
import { ensureVehicleSaleQrForStorage } from "@/lib/vehicle-qr";

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

/** Attach sale QR images to dash cards that opted in to buyer inquiries. */
export async function attachSaleQrsToDashCards(
  targets: SaleQrTarget[],
  applyQr: (vehicleEntryCode: string, qrImageUrl: string) => void,
): Promise<void> {
  const unique = new Map<string, SaleQrTarget>();
  for (const target of targets) {
    if (!target.vehicleEntryCode.trim()) continue;
    unique.set(target.vehicleEntryCode, target);
  }

  await Promise.all(
    [...unique.entries()].map(async ([code, target]) => {
      const qrImageUrl = await ensureVehicleSaleQrForStorage(
        code,
        target.eventId,
        target.storageId,
      );
      if (qrImageUrl) applyQr(code, qrImageUrl);
    }),
  );
}
