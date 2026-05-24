import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { privateAssetsR2, r2Buckets } from "@/lib/r2";

/**
 * Upload a private/internal asset to the non-public R2 assets bucket.
 * Returns the object key only — never expose credentials or presigned URLs to the browser.
 */
export async function uploadPrivateAsset(
  path: string,
  bytes: Buffer,
  contentType: string,
): Promise<{ objectKey: string } | { error: string }> {
  try {
    await privateAssetsR2.send(
      new PutObjectCommand({
        Bucket: r2Buckets.privateAssets,
        Key: path,
        Body: bytes,
        ContentType: contentType,
      }),
    );
    return { objectKey: path };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return { error: message };
  }
}

export async function readPrivateAsset(
  path: string,
): Promise<{ bytes: Buffer; contentType: string | undefined } | { error: string }> {
  try {
    const response = await privateAssetsR2.send(
      new GetObjectCommand({
        Bucket: r2Buckets.privateAssets,
        Key: path,
      }),
    );
    if (!response.Body) {
      return { error: "Object not found" };
    }
    const bytes = Buffer.from(await response.Body.transformToByteArray());
    return { bytes, contentType: response.ContentType };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Download failed";
    return { error: message };
  }
}
