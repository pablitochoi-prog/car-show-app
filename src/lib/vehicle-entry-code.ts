import {
  isValidPublicVehicleId,
  normalizeLoosePublicVehicleId,
  PUBLIC_VEHICLE_ID_REGEX,
} from "@/lib/event-sms-vehicle-id";

export { PUBLIC_VEHICLE_ID_REGEX, isValidPublicVehicleId };

/** Normalize URL path segment to canonical vehicle entry code (e.g. AXY-004). */
export function normalizeVehicleEntryCode(raw: string): string | null {
  return normalizeLoosePublicVehicleId(raw);
}

export function vehicleSmartRouteUrl(vehicleEntryCode: string): string {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  return `${origin.replace(/\/$/, "")}/v/${encodeURIComponent(vehicleEntryCode)}`;
}
