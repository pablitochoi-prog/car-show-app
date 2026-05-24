import { S3Client } from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const endpoint = `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`;

export const publicPhotosR2 = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId: requireEnv("R2_PUBLIC_PHOTOS_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_PUBLIC_PHOTOS_SECRET_ACCESS_KEY"),
  },
});

export const privateAssetsR2 = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId: requireEnv("R2_ASSETS_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_ASSETS_SECRET_ACCESS_KEY"),
  },
});

export const r2Buckets = {
  publicPhotos: requireEnv("R2_PUBLIC_PHOTOS_BUCKET_NAME"),
  privateAssets: requireEnv("R2_ASSETS_BUCKET_NAME"),
} as const;

export const r2PublicUrls = {
  publicPhotos: requireEnv("R2_PUBLIC_PHOTOS_BASE_URL").replace(/\/$/, ""),
} as const;

/** Build a public URL for an object key in the public photos bucket. */
export function buildPublicPhotoUrl(objectKey: string): string {
  const key = objectKey.replace(/^\//, "");
  return `${r2PublicUrls.publicPhotos}/${key}`;
}
