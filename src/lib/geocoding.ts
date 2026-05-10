import { mapsApiKey } from "@/lib/maps-api-key";

type AddressParts = {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

/**
 * Geocode a US-style address using Google Geocoding API.
 * Enable "Geocoding API" for your Google Cloud API key.
 */
export async function geocodeAddress(
  address: AddressParts
): Promise<{ lat: number; lng: number } | null> {
  const parts = [address.street, address.city, address.state, address.zip].filter(
    (p): p is string => Boolean(p && String(p).trim())
  );
  if (parts.length === 0) return null;

  const key = mapsApiKey();
  if (!key) return null;

  const addressStr = encodeURIComponent(parts.join(", "));
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${addressStr}&key=${key}`;

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const data = (await res.json()) as {
    status: string;
    results?: { geometry: { location: { lat: number; lng: number } } }[];
  };

  if (data.status !== "OK" || !data.results?.[0]) return null;

  const loc = data.results[0].geometry.location;
  return { lat: loc.lat, lng: loc.lng };
}
