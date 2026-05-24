import { findVehicleEntryByCode } from "@/lib/vehicle-entry-lookup";
import { vehicleSmartRouteUrl } from "@/lib/vehicle-entry-code";
import {
  ensureVehicleQrForEntry,
  vehicleQrSvgDataUrl,
} from "@/lib/vehicle-qr";

/** QR image URL for dash cards — R2 when available, inline SVG data URL as fallback. */
export async function ensureVehicleQrsForEntryCodes(
  codes: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(codes.filter(Boolean))];

  await Promise.all(
    unique.map(async (code) => {
      try {
        const entry = await findVehicleEntryByCode(code);
        if (entry) {
          const qr = await ensureVehicleQrForEntry(entry);
          if (qr?.qrUrl) {
            out.set(code, qr.qrUrl);
            return;
          }
        }
      } catch (e) {
        console.error("vehicle QR ensure failed:", code, e);
      }

      try {
        const fallback = await vehicleQrSvgDataUrl(vehicleSmartRouteUrl(code));
        out.set(code, fallback);
      } catch (e) {
        console.error("vehicle QR inline fallback failed:", code, e);
      }
    }),
  );

  return out;
}
