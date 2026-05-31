import {
  isValidPublicVehicleId,
  normalizeLoosePublicVehicleId,
  PUBLIC_VEHICLE_ID_REGEX,
} from "@/lib/event-sms-vehicle-id";
import { getSiteOrigin } from "@/lib/site-url";

export { PUBLIC_VEHICLE_ID_REGEX, isValidPublicVehicleId };

/** Normalize URL path segment to canonical vehicle entry code (e.g. AXY-004). */
export function normalizeVehicleEntryCode(raw: string): string | null {
  return normalizeLoosePublicVehicleId(raw);
}

/** Public smart-route URL encoded in dash-card QR codes (`/v/{vehicleEntryCode}`). */
export function vehicleSmartRouteUrl(vehicleEntryCode: string): string {
  return `${getSiteOrigin()}/v/${encodeURIComponent(vehicleEntryCode)}`;
}

/** Public vehicle sale listing page (`/v/{vehicleEntryCode}/sale`). */
export function vehicleSalePageUrl(vehicleEntryCode: string): string {
  return `${getSiteOrigin()}/v/${encodeURIComponent(vehicleEntryCode)}/sale`;
}
