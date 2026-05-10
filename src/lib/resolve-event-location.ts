import {
  parseGoogleAddressComponents,
  venueNameFromPlace,
  type GoogleAddressComponent,
} from "@/lib/google-address-components";
import { mapsApiKey } from "@/lib/maps-api-key";

export type ResolvedEventLocation = {
  venue: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  source: "places" | "geocode";
};

async function fetchPlaceDetails(
  placeId: string,
  key: string
): Promise<{
  name: string;
  types: string[];
  geometry: { location: { lat: number; lng: number } };
  address_components: GoogleAddressComponent[];
} | null> {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: "name,geometry,address_component,types",
    key,
  });
  const url = `https://maps.googleapis.com/maps/api/place/details/json?${params}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    status: string;
    result?: {
      name: string;
      types: string[];
      geometry: { location: { lat: number; lng: number } };
      address_components: GoogleAddressComponent[];
    };
  };
  if (data.status !== "OK" || !data.result?.geometry?.location) return null;
  return data.result;
}

/** Places Text Search → Place Details (venue / POI). Exported for car-club meeting flow. */
export async function tryPlacesChain(
  query: string,
  key: string
): Promise<ResolvedEventLocation | null> {
  const tsParams = new URLSearchParams({
    query,
    region: "us",
    key,
  });
  const tsUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?${tsParams}`;
  const tsRes = await fetch(tsUrl);
  if (!tsRes.ok) return null;
  const tsData = (await tsRes.json()) as {
    status: string;
    error_message?: string;
    results?: { place_id?: string }[];
  };

  if (
    (tsData.status !== "OK" && tsData.status !== "ZERO_RESULTS") ||
    !tsData.results?.[0]?.place_id
  ) {
    return null;
  }

  const details = await fetchPlaceDetails(tsData.results[0].place_id!, key);
  if (!details) return null;

  const parsed = parseGoogleAddressComponents(details.address_components ?? []);
  const loc = details.geometry.location;
  const venue = venueNameFromPlace(details.types ?? [], details.name ?? "");

  return {
    venue,
    street: parsed.street,
    city: parsed.city,
    state: parsed.state,
    zip: parsed.zip,
    lat: loc.lat,
    lng: loc.lng,
    source: "places",
  };
}

/** Geocoding API (street address). Exported for car-club meeting flow. */
export async function tryGeocode(
  query: string,
  key: string
): Promise<ResolvedEventLocation | null> {
  const params = new URLSearchParams({
    address: query,
    components: "country:US",
    key,
  });
  const url = `https://maps.googleapis.com/maps/api/geocode/json?${params}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    status: string;
    error_message?: string;
    results?: {
      geometry: { location: { lat: number; lng: number } };
      address_components: GoogleAddressComponent[];
    }[];
  };

  if (data.status !== "OK" || !data.results?.[0]) return null;

  const r = data.results[0];
  const parsed = parseGoogleAddressComponents(r.address_components ?? []);
  const loc = r.geometry.location;

  return {
    venue: "",
    street: parsed.street,
    city: parsed.city,
    state: parsed.state,
    zip: parsed.zip,
    lat: loc.lat,
    lng: loc.lng,
    source: "geocode",
  };
}

/**
 * Resolve free-form US venue or address text via Places (text search + details), then Geocoding API.
 */
export async function resolveEventLocation(
  query: string
): Promise<ResolvedEventLocation | null> {
  const key = mapsApiKey();
  const trimmed = query.trim();
  if (!key || trimmed.length < 3) return null;

  const fromPlaces = await tryPlacesChain(trimmed, key);
  if (fromPlaces) return fromPlaces;

  return tryGeocode(trimmed, key);
}

export function resolveLocationMapsDisabledReason(): string | null {
  return mapsApiKey() ? null : "Maps API key is not configured.";
}

/** Server-only: Places Text Search path only (no geocode fallback). */
export async function resolveViaPlacesTextSearch(
  query: string
): Promise<ResolvedEventLocation | null> {
  const key = mapsApiKey();
  const q = query.trim();
  if (!key || q.length < 3) return null;
  return tryPlacesChain(q, key);
}

/** Server-only: Geocoding path only (no Places). */
export async function resolveViaGeocodeOnly(
  query: string
): Promise<ResolvedEventLocation | null> {
  const key = mapsApiKey();
  const q = query.trim();
  if (!key || q.length < 3) return null;
  return tryGeocode(q, key);
}
