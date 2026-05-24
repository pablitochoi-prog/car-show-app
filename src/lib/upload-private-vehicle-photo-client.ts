const ACCEPT = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;

export type PrivateVehiclePhotoUploadResult =
  | { ok: true; viewUrl: string; photoId: string }
  | { ok: false; error: string };

/** Upload a garage vehicle photo through the app server (private R2 storage). */
export async function uploadPrivateVehiclePhoto(
  vehicleId: string,
  file: File,
  options?: { isPrimary?: boolean },
): Promise<PrivateVehiclePhotoUploadResult> {
  if (!ACCEPT.has(file.type)) {
    return { ok: false, error: "Use a JPG, PNG, or WebP image." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File is too large (max 10MB)." };
  }

  try {
    const formData = new FormData();
    formData.append("file", file);
    if (options?.isPrimary !== false) {
      formData.append("isPrimary", "true");
    }

    const res = await fetch(`/api/vehicles/${vehicleId}/photos/upload`, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    });

    const data = (await res.json()) as {
      error?: string;
      id?: string;
      viewUrl?: string;
    };

    if (!res.ok) {
      return { ok: false, error: data.error ?? "Could not upload photo." };
    }
    if (!data.id || !data.viewUrl) {
      return { ok: false, error: "Invalid upload response." };
    }

    return {
      ok: true,
      photoId: data.id,
      viewUrl: data.viewUrl,
    };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Network error while uploading photo.";
    return { ok: false, error: message };
  }
}
