/** Public site origin for canonical URLs, Open Graph, and JSON-LD. */
export function getSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return "https://events.carshowscout.com";
}
