import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { buildPublicPhotoUrl } from "@/lib/r2";
import { uploadPublicPhoto } from "@/lib/storage/public-photos";
import { vehicleSmartRouteUrl } from "@/lib/vehicle-entry-code";
import type { VehicleEntryRecord } from "@/lib/vehicle-entry-types";

export function vehicleQrObjectKey(
  eventId: string,
  vehicleEntryId: string,
): string {
  return `events/${eventId}/vehicles/${vehicleEntryId}/qr/vehicle-qr.svg`;
}

/** Stable R2 folder id: registration vehicle row id, or guest composite id. */
export function vehicleQrStorageId(entry: Pick<
  VehicleEntryRecord,
  "registrationVehicleId" | "registrationId" | "vehicleEntryCode"
>): string {
  if (entry.registrationVehicleId) return entry.registrationVehicleId;
  const safe = entry.vehicleEntryCode.replace(/[^A-Za-z0-9-]/g, "_");
  return `${entry.registrationId}-${safe}`;
}

async function generateQrSvg(destinationUrl: string): Promise<Buffer> {
  const svg = await QRCode.toString(destinationUrl, {
    type: "svg",
    margin: 1,
    width: 280,
    errorCorrectionLevel: "M",
  });
  return Buffer.from(svg, "utf8");
}

/** Inline SVG data URL — always works for dash cards even when R2 upload fails. */
export function vehicleQrSvgDataUrlFromBuffer(svg: Buffer): string {
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}

export async function vehicleQrSvgDataUrl(destinationUrl: string): Promise<string> {
  const svg = await generateQrSvg(destinationUrl);
  return vehicleQrSvgDataUrlFromBuffer(svg);
}

export async function ensureVehicleQrForEntry(
  entry: VehicleEntryRecord,
): Promise<{ qrUrl: string; objectKey: string } | null> {
  if (!entry.vehicleEntryCode) return null;

  const storageId = vehicleQrStorageId(entry);
  const objectKey = vehicleQrObjectKey(entry.eventId, storageId);
  const destinationUrl = vehicleSmartRouteUrl(entry.vehicleEntryCode);

  if (
    entry.vehicleQrObjectKey === objectKey &&
    entry.vehicleQrUrl?.trim()
  ) {
    return { qrUrl: entry.vehicleQrUrl.trim(), objectKey };
  }

  const svg = await generateQrSvg(destinationUrl);
  const inlineDataUrl = vehicleQrSvgDataUrlFromBuffer(svg);

  let publicUrl: string | null = null;
  try {
    const uploaded = await uploadPublicPhoto(objectKey, svg, "image/svg+xml");
    if ("error" in uploaded) {
      console.error("vehicle QR upload failed:", uploaded.error);
    } else {
      publicUrl = uploaded.publicUrl;
      if (entry.registrationVehicleId) {
        try {
          await prisma.registrationVehicle.update({
            where: { id: entry.registrationVehicleId },
            data: {
              vehicleQrObjectKey: objectKey,
              vehicleQrUrl: uploaded.publicUrl,
            },
          });
        } catch (e) {
          console.error("vehicle QR DB persist failed:", e);
        }
      }
    }
  } catch (e) {
    console.error("vehicle QR upload error:", e);
  }

  return { qrUrl: publicUrl ?? inlineDataUrl, objectKey };
}

/** Regenerate QR when smart-route URL or key path changes. */
export function expectedVehicleQrPublicUrl(objectKey: string): string {
  return buildPublicPhotoUrl(objectKey);
}
