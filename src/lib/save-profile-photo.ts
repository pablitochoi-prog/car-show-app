import { prisma } from "@/lib/db";
import { uploadPrivateAsset } from "@/lib/storage/private-assets";
import {
  isProfilePhotoObjectKey,
  PROFILE_PHOTO_CONTENT_TYPES,
  PROFILE_PHOTO_MAX_BYTES,
  profilePhotoKeyPrefix,
} from "@/lib/profile-photo-access";

function extensionFromFilename(filename: string, contentType: string): string {
  const raw = filename.split(".").pop()?.toLowerCase() ?? "";
  if (/^[a-z0-9]{2,5}$/.test(raw)) return raw;

  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return byType[contentType] ?? "bin";
}

export async function saveProfilePhoto(
  userId: string,
  file: File,
): Promise<
  | { ok: true; objectKey: string; viewUrl: string }
  | { ok: false; error: string; status: number }
> {
  const contentType = file.type || "application/octet-stream";
  if (!PROFILE_PHOTO_CONTENT_TYPES.has(contentType)) {
    return {
      ok: false,
      error: "Use a JPG, PNG, or WebP image.",
      status: 400,
    };
  }

  if (file.size > PROFILE_PHOTO_MAX_BYTES) {
    return {
      ok: false,
      error: "File is too large (max 5MB).",
      status: 400,
    };
  }

  const extension = extensionFromFilename(file.name, contentType);
  const objectKey = `${profilePhotoKeyPrefix(userId)}/${crypto.randomUUID()}.${extension}`;

  const bytes = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadPrivateAsset(objectKey, bytes, contentType);
  if ("error" in uploaded) {
    return { ok: false, error: uploaded.error, status: 500 };
  }

  if (!isProfilePhotoObjectKey(objectKey, userId)) {
    return { ok: false, error: "Invalid object key", status: 500 };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: objectKey },
  });

  return {
    ok: true,
    objectKey,
    viewUrl: "/api/me/avatar/view",
  };
}
