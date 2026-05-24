import { uploadPublicPhoto } from "@/lib/storage/public-photos";

/**
 * @deprecated Prefer `uploadPublicPhoto`. Kept for existing upload routes.
 * All former Supabase `event-assets` uploads now go to the R2 public photos bucket.
 */
export async function uploadEventAsset(
  path: string,
  bytes: Buffer,
  contentType: string,
): Promise<{ publicUrl: string } | { error: string }> {
  return uploadPublicPhoto(path, bytes, contentType);
}
