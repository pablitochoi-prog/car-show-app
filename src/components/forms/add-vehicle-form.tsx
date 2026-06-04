"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { vehiclePhotoImgClassName } from "@/components/vehicle/vehicle-photo-display";
import {
  VehicleLookupFields,
  type VehicleLookupValues,
} from "@/components/forms/vehicle-lookup-fields";
import { normalizeVinInput } from "@/lib/vehicle-vin";

type SavedVehicle = {
  id: string;
  year: number;
  make: string;
  model: string;
  trim?: string | null;
  nickname?: string | null;
  vin?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
};

export function AddVehicleForm({
  onSaved,
  returnTo,
  onVehicleAdded,
}: {
  onSaved?: () => void;
  /** After save, redirect here with ?addedVehicle=<id> (must be an app path). */
  returnTo?: string | null;
  /** When set, stay on the current page and add the saved vehicle to registration. */
  onVehicleAdded?: (vehicle: SavedVehicle) => void;
} = {}) {
  const router = useRouter();

  const [lookup, setLookup] = useState<VehicleLookupValues>({
    year: "",
    make: "",
    model: "",
    trim: "",
  });
  const [nickname, setNickname] = useState("");
  const [vin, setVin] = useState("");
  const [notes, setNotes] = useState("");
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pendingPhoto) {
      setPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingPhoto);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingPhoto]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const yearNum = Number.parseInt(
        lookup.year.replace(/\D/g, "").slice(0, 4),
        10,
      );
      if (!Number.isFinite(yearNum)) {
        setError("Enter a valid four-digit year.");
        return;
      }

      const res = await fetch("/api/vehicles", {
        method: "POST",
        credentials: "same-origin",
        body: (() => {
          const fd = new FormData();
          fd.append("year", String(yearNum));
          fd.append("make", lookup.make.trim());
          fd.append("model", lookup.model.trim());
          if (lookup.trim.trim()) fd.append("trim", lookup.trim.trim());
          if (nickname.trim()) fd.append("nickname", nickname.trim());
          if (vin.trim()) fd.append("vin", vin.trim());
          if (notes.trim()) fd.append("notes", notes.trim());
          if (pendingPhoto) fd.append("photo", pendingPhoto);
          return fd;
        })(),
      });

      const raw = await res.text();
      let data: { error?: string; id?: string; photoError?: string } = {};
      try {
        data = raw.trim()
          ? (JSON.parse(raw) as { error?: string; id?: string })
          : {};
      } catch {
        setError(
          `Save failed (HTTP ${res.status}). The server returned a non-JSON response—often because the database needs updating. In your project folder run: npx prisma migrate deploy`,
        );
        return;
      }

      if (!res.ok) {
        setError(data.error ?? `Could not save vehicle (${res.status}).`);
        return;
      }

      const saved = data as SavedVehicle;

      if (onVehicleAdded && saved.id) {
        if (data.photoError) {
          setError(
            `Vehicle saved, but photo upload failed: ${data.photoError}. You can add a photo from the registration list.`,
          );
        }
        onVehicleAdded({
          id: saved.id,
          year: saved.year ?? yearNum,
          make: saved.make ?? lookup.make.trim(),
          model: saved.model ?? lookup.model.trim(),
          trim: saved.trim ?? (lookup.trim.trim() || null),
          nickname: saved.nickname ?? (nickname.trim() || null),
          vin: saved.vin ?? (vin.trim() || null),
          photoUrl: saved.photoUrl ?? null,
          notes: saved.notes ?? (notes.trim() || null),
        });
        setLookup({ year: "", make: "", model: "", trim: "" });
        setNickname("");
        setVin("");
        setNotes("");
        setPendingPhoto(null);
        onSaved?.();
        return;
      }

      if (data.photoError) {
        setError(
          `Vehicle saved, but photo upload failed: ${data.photoError}. Use Edit to add a photo.`,
        );
      } else if (returnTo && saved.id) {
        const dest = `${returnTo}${returnTo.includes("?") ? "&" : "?"}addedVehicle=${encodeURIComponent(saved.id)}`;
        router.push(dest);
        return;
      }

      setLookup({ year: "", make: "", model: "", trim: "" });
      setNickname("");
      setVin("");
      setNotes("");
      setPendingPhoto(null);
      router.refresh();
      onSaved?.();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Network error — try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function onVehiclePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Use a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large (max 10MB).");
      return;
    }
    setPendingPhoto(file);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border p-4" autoComplete="off">
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 rounded-md p-2">
          {error}
        </div>
      )}
      <p className="text-sm font-medium">Add a vehicle</p>

      <VehicleLookupFields
        idPrefix="avf"
        values={lookup}
        onChange={setLookup}
      />

      {/* Nickname / VIN */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vehicle-nickname">Vehicle nickname</Label>
          <Input
            id="vehicle-nickname"
            name="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 48))}
            maxLength={48}
            placeholder={'e.g. "Midnight Runner", "Dad\'s 67"'}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicle-vin">VIN (optional)</Label>
          <Input
            id="vehicle-vin"
            name="vin"
            value={vin}
            onChange={(e) => setVin(normalizeVinInput(e.target.value))}
            maxLength={17}
            placeholder="e.g. 1HGBH41JXMN109186"
            autoComplete="off"
            className="font-mono uppercase tabular-nums tracking-wide"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">
            Saved to My Vehicles. Not required to register for this event.
          </p>
        </div>
      </div>

      {/* Vehicle Story */}
      <div className="space-y-2">
        <Label htmlFor="vehicle-story">Vehicle Story</Label>
        <Textarea
          id="vehicle-story"
          name="vehicleStory"
          rows={3}
          placeholder="Tell the story behind your car - how you found it, restored it, or what makes it special."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="[field-sizing:fixed] min-h-[5.25rem] resize-y"
        />
      </div>

      {/* Photo upload */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="vehicle-photo-frame flex w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {photoPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoPreviewUrl}
              alt=""
              className={vehiclePhotoImgClassName}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
              Preview
            </div>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="vehicle-photo-input">Vehicle photo</Label>
          <input
            ref={fileInputRef}
            id="vehicle-photo-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={onVehiclePhotoSelected}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Choose photo
            </Button>
            {pendingPhoto ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => setPendingPhoto(null)}
              >
                <X className="mr-1 h-4 w-4" />
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, or WebP · max 10MB · stored privately in your garage
          </p>
        </div>
      </div>

      <Button type="submit" size="sm" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save vehicle
      </Button>
    </form>
  );
}
