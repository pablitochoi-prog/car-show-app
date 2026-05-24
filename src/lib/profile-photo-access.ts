import { splitUserDisplayName } from "@/lib/profile-display-name";

export const PROFILE_PHOTO_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export function profilePhotoKeyPrefix(userId: string): string {
  return `profile-photos/${userId}`;
}

export function profilePhotoViewPath(): string {
  return "/api/me/avatar/view";
}

export function isProfilePhotoObjectKey(
  objectKey: string,
  userId: string,
): boolean {
  const prefix = `${profilePhotoKeyPrefix(userId)}/`;
  return objectKey.startsWith(prefix) && !objectKey.includes("\\");
}

export function userHasProfilePhoto(avatarUrl: string | null | undefined): boolean {
  return (
    typeof avatarUrl === "string" &&
    avatarUrl.startsWith("profile-photos/") &&
    avatarUrl.length > "profile-photos/".length
  );
}

export function getUserInitials(input: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
}): string {
  const { firstName, lastName } = splitUserDisplayName(
    input.name ?? "",
    input.firstName,
    input.lastName,
  );

  const f = firstName.trim();
  const l = lastName.trim();

  if (f && l) {
    return `${f[0] ?? ""}${l[0] ?? ""}`.toUpperCase();
  }
  if (f.length >= 2) return f.slice(0, 2).toUpperCase();
  if (f.length === 1) return f.toUpperCase();
  if (l.length >= 2) return l.slice(0, 2).toUpperCase();
  if (l.length === 1) return l.toUpperCase();

  const email = input.email?.trim();
  if (email) return email[0]!.toUpperCase();

  return "?";
}
