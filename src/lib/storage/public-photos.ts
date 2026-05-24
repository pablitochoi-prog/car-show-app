import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
  buildPublicPhotoUrl,
  publicPhotosR2,
  r2Buckets,
} from "@/lib/r2";

/**
 * Upload a publicly readable photo or image (event flyers, logos, vehicle photos, etc.)
 * to the Cloudflare R2 public photos bucket.
 */
export async function uploadPublicPhoto(
  path: string,
  bytes: Buffer,
  contentType: string,
): Promise<{ publicUrl: string } | { error: string }> {
  try {
    await publicPhotosR2.send(
      new PutObjectCommand({
        Bucket: r2Buckets.publicPhotos,
        Key: path,
        Body: bytes,
        ContentType: contentType,
      }),
    );
    return { publicUrl: buildPublicPhotoUrl(path) };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return { error: message };
  }
}
