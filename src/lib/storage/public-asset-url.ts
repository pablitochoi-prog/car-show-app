/**
 * True if the URL is a public object in our Supabase `event-assets` bucket
 * (same bucket used for org logos, event art, and vehicle photos).
 */
export function isEventAssetsPublicUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname.endsWith(".supabase.co") &&
      u.pathname.startsWith("/storage/v1/object/public/event-assets/")
    );
  } catch {
    return false;
  }
}
