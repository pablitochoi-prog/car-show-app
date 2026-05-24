"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Star, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadPrivateVehiclePhoto } from "@/lib/upload-private-vehicle-photo-client";

type VehiclePhotoRow = {
  id: string;
  vehicleId: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  isPrimary: boolean;
  status: string;
  createdAt: string;
  viewUrl: string;
};

export function GarageVehiclePhotoUpload({ vehicleId }: { vehicleId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<VehiclePhotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadPhotos = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/photos`, {
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        photos?: VehiclePhotoRow[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not load photos.");
        return;
      }
      setPhotos(data.photos ?? []);
    } catch {
      setError("Could not load photos.");
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");
    setUploading(true);
    try {
      const result = await uploadPrivateVehiclePhoto(vehicleId, file, {
        isPrimary: photos.length === 0,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await loadPhotos();
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function setPrimary(photoId: string) {
    setBusyPhotoId(photoId);
    setError("");
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/photos/${photoId}`, {
        method: "PATCH",
        credentials: "same-origin",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not set primary photo.");
        return;
      }
      await loadPhotos();
    } catch {
      setError("Could not set primary photo.");
    } finally {
      setBusyPhotoId(null);
    }
  }

  async function removePhoto(photoId: string) {
    if (!confirm("Remove this photo from your garage?")) return;
    setBusyPhotoId(photoId);
    setError("");
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/photos/${photoId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not delete photo.");
        return;
      }
      await loadPhotos();
    } catch {
      setError("Could not delete photo.");
    } finally {
      setBusyPhotoId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Label className="sr-only">Garage vehicle photos</Label>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => void onFileSelected(e)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {uploading ? "Uploading…" : "Upload photo"}
        </Button>
        <p className="text-xs text-muted-foreground">JPG, PNG, or WebP · max 10MB</p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading photos…</p>
      ) : photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No garage photos yet. Uploads are stored privately in your account.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="overflow-hidden rounded-lg border bg-muted/20"
            >
              <div className="relative aspect-[4/3] bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.viewUrl}
                  alt={photo.originalFilename}
                  className="h-full w-full object-cover"
                />
                {photo.isPrimary ? (
                  <span className="absolute left-2 top-2 rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    Primary
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-2 p-2">
                <p className="min-w-0 truncate text-xs text-muted-foreground">
                  {photo.originalFilename}
                </p>
                <div className="flex shrink-0 gap-1">
                  {!photo.isPrimary ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={busyPhotoId === photo.id}
                      title="Set as primary"
                      onClick={() => void setPrimary(photo.id)}
                    >
                      <Star className="size-4" />
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive"
                    disabled={busyPhotoId === photo.id}
                    title="Delete photo"
                    onClick={() => void removePhoto(photo.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
