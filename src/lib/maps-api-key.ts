/** Prefer the server-only key; fall back to the public bundle key. */
export function mapsApiKey(): string | null {
  const key =
    process.env.GOOGLE_MAPS_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  return key?.trim() || null;
}
