import {
  resolveViaGeocodeOnly,
  resolveViaPlacesTextSearch,
  type ResolvedEventLocation,
} from "@/lib/resolve-event-location";

export type ResolveCarClubMeetingParams = {
  city: string;
  state: string;
  place?: string;
  street?: string;
};

/**
 * Venue path: Place + City + State → Google Places (text search + details).
 * Address path: Street + City + State → Geocoding API.
 * If both place and street are set, street wins (more specific mailing address).
 */
export async function resolveCarClubMeetingLocation(
  params: ResolveCarClubMeetingParams
): Promise<ResolvedEventLocation | null> {
  const city = params.city.trim();
  const state = params.state.trim().toUpperCase();
  const place = params.place?.trim() ?? "";
  const street = params.street?.trim() ?? "";

  if (!city || state.length !== 2) return null;

  if (street.length > 0) {
    const query = `${street}, ${city}, ${state}`;
    return resolveViaGeocodeOnly(query);
  }

  if (place.length > 0) {
    const query = `${place} ${city} ${state}`;
    return resolveViaPlacesTextSearch(query);
  }

  return null;
}
