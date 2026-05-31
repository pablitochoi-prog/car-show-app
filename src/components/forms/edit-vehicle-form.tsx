"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { GarageVehiclePhotoUpload } from "@/components/garage/garage-vehicle-photo-upload";

export type EditVehicleInitial = {
  year: number;
  make: string;
  model: string;
  trim: string | null;
  nickname: string | null;
  vin: string | null;
  notes: string | null;
  photoUrl: string | null;
};

export type EditVehicleSaved = {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  nickname: string | null;
  vin: string | null;
  photoUrl: string | null;
  notes: string | null;
};

async function loadPrimaryGaragePhotoUrl(
  vehicleId: string,
): Promise<string | null> {
  try {
    const res = await fetch(`/api/vehicles/${vehicleId}/photos`, {
      credentials: "same-origin",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      photos?: Array<{ isPrimary: boolean; viewUrl: string }>;
    };
    const photos = data.photos ?? [];
    const primary =
      photos.find((photo) => photo.isPrimary) ?? photos[0] ?? null;
    return primary?.viewUrl ?? null;
  } catch {
    return null;
  }
}

export function EditVehicleForm({
  vehicleId,
  initial,
  embedded = false,
  onSaved,
  onCancel,
}: {
  vehicleId: string;
  initial: EditVehicleInitial;
  /** Inline/dialog use — no redirect after save. */
  embedded?: boolean;
  onSaved?: (vehicle: EditVehicleSaved) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [year, setYear] = useState(String(initial.year));
  const [make, setMake] = useState(initial.make);
  const [model, setModel] = useState(initial.model);
  const [trim, setTrim] = useState(initial.trim ?? "");
  const [nickname, setNickname] = useState(initial.nickname ?? "");
  const [vin, setVin] = useState(initial.vin ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const yearNum = Number.parseInt(
        year.replace(/\D/g, "").slice(0, 4),
        10,
      );
      if (!Number.isFinite(yearNum)) {
        setError("Enter a valid four-digit year.");
        return;
      }

      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          year: yearNum,
          make: make.trim(),
          model: model.trim(),
          trim: trim.trim(),
          nickname: nickname.trim(),
          vin: vin.trim(),
          notes: notes.trim(),
        }),
      });

      const raw = await res.text();
      let data: { error?: string } = {};
      try {
        data = raw.trim() ? (JSON.parse(raw) as { error?: string }) : {};
      } catch {
        setError(
          `Save failed (HTTP ${res.status}). The server returned an invalid response.`,
        );
        return;
      }

      if (!res.ok) {
        setError(data.error ?? `Could not save (${res.status}).`);
        return;
      }

      const updated = JSON.parse(raw) as EditVehicleSaved;
      const primaryPhotoUrl = await loadPrimaryGaragePhotoUrl(vehicleId);

      if (onSaved) {
        onSaved({
          id: updated.id,
          year: updated.year,
          make: updated.make,
          model: updated.model,
          trim: updated.trim,
          nickname: updated.nickname,
          vin: updated.vin,
          photoUrl: primaryPhotoUrl ?? updated.photoUrl,
          notes: updated.notes ?? (notes.trim() || null),
        });
        return;
      }

      router.push("/dashboard/vehicles");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Network error — try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn("space-y-4", !embedded && "rounded-lg border p-4")}
    >
      {error ? (
        <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!embedded ? <p className="text-sm font-medium">Edit vehicle</p> : null}

      <div className="max-sm:-mx-2 max-sm:overflow-x-auto max-sm:px-2 max-sm:pb-1">
        <div className="grid min-w-0 grid-cols-[minmax(0,4.5rem)_minmax(0,12ch)_minmax(0,20ch)_minmax(0,1fr)] items-end gap-3 max-sm:min-w-[28rem]">
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="edit-vy">Year</Label>
            <Input
              id="edit-vy"
              inputMode="numeric"
              autoComplete="off"
              placeholder="YYYY"
              value={year}
              onChange={(e) =>
                setYear(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              required
              maxLength={4}
              className="tabular-nums"
            />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="edit-vmk">Make</Label>
            <Input
              id="edit-vmk"
              value={make}
              onChange={(e) => setMake(e.target.value.slice(0, 12))}
              required
              maxLength={12}
              autoComplete="off"
            />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="edit-vmo">Model</Label>
            <Input
              id="edit-vmo"
              value={model}
              onChange={(e) => setModel(e.target.value.slice(0, 20))}
              required
              maxLength={20}
              autoComplete="off"
            />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="edit-vtr">Trim</Label>
            <Input
              id="edit-vtr"
              value={trim}
              onChange={(e) => setTrim(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-nickname">Vehicle nickname</Label>
          <Input
            id="edit-nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 48))}
            maxLength={48}
            placeholder={'e.g. "Midnight Runner", "Dad\'s 67"'}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-vin">VIN</Label>
          <Input
            id="edit-vin"
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

      <div className="space-y-2">
        <Label htmlFor="edit-story">Vehicle Story</Label>
        <Textarea
          id="edit-story"
          rows={3}
          placeholder="Tell the story behind your car - how you found it, restored it, or what makes it special."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="[field-sizing:fixed] min-h-[5.25rem] resize-y"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Garage photos</p>
        <p className="text-xs text-muted-foreground">
          Private photos stored in your garage. The primary photo appears on your
          vehicle list.
        </p>
        <GarageVehiclePhotoUpload vehicleId={vehicleId} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : (
          <Link
            href="/dashboard/vehicles"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
