"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, X } from "lucide-react";
import {
  VehicleLookupFields,
  type VehicleLookupValues,
} from "@/components/forms/vehicle-lookup-fields";

export function AddVehicleForm({ onSaved }: { onSaved?: () => void } = {}) {
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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          year: yearNum,
          make: lookup.make.trim(),
          model: lookup.model.trim(),
          trim: lookup.trim.trim() || undefined,
          nickname: nickname.trim() || undefined,
          vin: vin.trim() || undefined,
          photoUrl: photoUrl ?? undefined,
          notes: notes.trim() ? notes.trim() : undefined,
        }),
      });

      const raw = await res.text();
      let data: { error?: string } = {};
      try {
        data = raw.trim() ? (JSON.parse(raw) as { error?: string }) : {};
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

      setLookup({ year: "", make: "", model: "", trim: "" });
      setNickname("");
      setVin("");
      setNotes("");
      setPhotoUrl(null);
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

  async function onVehiclePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPhotoUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/vehicles/upload", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const raw = await res.text();
      let data = {} as { error?: string; url?: string };
      try {
        data = raw.trim()
          ? (JSON.parse(raw) as { error?: string; url?: string })
          : {};
      } catch {
        setError(
          `Upload failed (HTTP ${res.status}). Check that Supabase storage is configured.`,
        );
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Could not upload photo");
        return;
      }
      if (data.url) setPhotoUrl(data.url);
    } catch {
      setError("Could not upload photo");
    } finally {
      setPhotoUploading(false);
    }
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
          <Label htmlFor="vehicle-vin">VIN</Label>
          <Input
            id="vehicle-vin"
            name="vin"
            value={vin}
            onChange={(e) =>
              setVin(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-HJ-NPR-Z0-9]/g, "")
                  .slice(0, 17),
              )
            }
            maxLength={17}
            placeholder="e.g. 1HGBH41JXMN109186"
            autoComplete="off"
            className="font-mono uppercase tabular-nums tracking-wide"
            spellCheck={false}
          />
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
        <div className="relative h-28 w-40 shrink-0 overflow-hidden rounded-lg border bg-muted">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt=""
              fill
              className="object-cover"
              sizes="160px"
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
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={onVehiclePhotoSelected}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={photoUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {photoUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {photoUploading ? "Uploading…" : "Upload photo"}
            </Button>
            {photoUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => setPhotoUrl(null)}
              >
                <X className="mr-1 h-4 w-4" />
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WebP, or GIF · max 8MB
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
