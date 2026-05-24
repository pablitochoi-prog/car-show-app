function publicPhotosBaseUrl(): string | null {
  const raw = process.env.R2_PUBLIC_PHOTOS_BASE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function isLegacySupabaseEventAssetsUrl(url: string): boolean {
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

function isR2PublicPhotosUrl(url: string): boolean {
  const baseOrigin = publicPhotosBaseUrl();
  if (!baseOrigin) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.origin === baseOrigin;
  } catch {
    return false;
  }
}

/**
 * True if the URL is a public app-managed asset (R2 public photos bucket or legacy Supabase).
 */
export function isEventAssetsPublicUrl(url: string): boolean {
  return isR2PublicPhotosUrl(url) || isLegacySupabaseEventAssetsUrl(url);
}

export function isPublicPhotosUrl(url: string): boolean {
  return isR2PublicPhotosUrl(url);
}
