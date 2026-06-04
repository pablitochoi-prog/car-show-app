"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2, Trophy } from "lucide-react";
import { AwardsCountBadge } from "@/components/dashboard/awards-count-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readResponseJson } from "@/lib/read-response-json";
import type {
  MyGarageVehicleAwardsSection,
  MyVehicleAwardEntry,
} from "@/lib/my-vehicle-awards";

export function parseManualAwardId(id: string): string | null {
  if (!id.startsWith("manual:")) return null;
  return id.slice("manual:".length) || null;
}

export function AwardRow({
  award,
  onDelete,
  deleting,
}: {
  award: MyVehicleAwardEntry;
  onDelete?: () => void;
  deleting: boolean;
}) {
  return (
    <article className="flex gap-3 rounded-lg border bg-card p-3 shadow-sm">
      <Trophy
        className="mt-0.5 size-4 shrink-0 text-amber-600"
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-medium leading-snug">
          {award.eventName}
          <span className="text-muted-foreground"> · {award.eventDateLabel}</span>
        </p>
        <p className="text-sm leading-snug">
          <span className="font-medium">{award.awardName}</span>
          {award.organizationName ? (
            <span className="text-muted-foreground">
              {" "}
              · {award.organizationName}
            </span>
          ) : null}
        </p>
      </div>
      {award.source === "manual" && onDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
          disabled={deleting}
          aria-label="Remove award"
          onClick={onDelete}
        >
          {deleting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
        </Button>
      ) : null}
    </article>
  );
}

export function AddManualAwardForm({
  vehicleId,
  onDone,
}: {
  vehicleId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awardName, setAwardName] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [organizationName, setOrganizationName] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/manual-awards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          awardName,
          eventName,
          eventDate,
          organizationName: organizationName.trim() || null,
        }),
      });
      const parsed = await readResponseJson<{ error?: string }>(res);
      if (!parsed.bodyIsJson || !res.ok) {
        throw new Error(parsed.data?.error ?? "Could not save award.");
      }
      setAwardName("");
      setEventName("");
      setEventDate("");
      setOrganizationName("");
      setOpen(false);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save award.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full sm:w-auto"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" aria-hidden />
        Add award from another show
      </Button>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="space-y-3 rounded-lg border border-dashed bg-background p-4"
    >
      <p className="text-sm font-medium">Award from another car show</p>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`award-${vehicleId}`}>Award / trophy name</Label>
          <Input
            id={`award-${vehicleId}`}
            value={awardName}
            onChange={(e) => setAwardName(e.target.value)}
            placeholder="Best in Show — 1st Place"
            required
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[min(100%,14rem)] flex-1 space-y-1.5">
            <Label htmlFor={`event-${vehicleId}`}>Event name</Label>
            <Input
              id={`event-${vehicleId}`}
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Spring Nationals 2025"
              required
            />
          </div>
          <div className="w-full min-w-[9.5rem] shrink-0 space-y-1.5 sm:w-auto">
            <Label htmlFor={`date-${vehicleId}`}>Event date</Label>
            <Input
              id={`date-${vehicleId}`}
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </div>
          <div className="min-w-[min(100%,14rem)] flex-1 space-y-1.5">
            <Label htmlFor={`org-${vehicleId}`}>
              Host organization (optional)
            </Label>
            <Input
              id={`org-${vehicleId}`}
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Local car club"
            />
          </div>
        </div>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : "Save award"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={saving}
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Vertical award history for one garage vehicle. */
export function VehicleAwardsHistory({
  section,
  onRefresh,
  showAddForm = true,
}: {
  section: MyGarageVehicleAwardsSection;
  onRefresh: () => void;
  showAddForm?: boolean;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const ymm = [section.year, section.make, section.model]
    .filter(Boolean)
    .join(" ");

  async function handleDelete(award: MyVehicleAwardEntry) {
    const awardId = parseManualAwardId(award.id);
    if (!awardId) return;
    if (!confirm("Remove this award from your vehicle history?")) return;

    setDeletingId(award.id);
    try {
      const res = await fetch(
        `/api/vehicles/${section.vehicleId}/manual-awards/${awardId}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      if (!res.ok) {
        const parsed = await readResponseJson<{ error?: string }>(res);
        throw new Error(parsed.data?.error ?? "Could not remove award.");
      }
      onRefresh();
    } catch {
      alert("Could not remove award. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Awards &amp; trophies</h2>
        <AwardsCountBadge count={section.awards.length} showZero />
      </div>

      {showAddForm ? (
        <AddManualAwardForm vehicleId={section.vehicleId} onDone={onRefresh} />
      ) : null}

      {section.awards.length > 0 ? (
        <div
          className="space-y-2"
          role="list"
          aria-label={`Award history for ${ymm}`}
        >
          {section.awards.map((award) => (
            <div key={award.id} role="listitem">
              <AwardRow
                award={award}
                deleting={deletingId === award.id}
                onDelete={
                  award.source === "manual"
                    ? () => void handleDelete(award)
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
