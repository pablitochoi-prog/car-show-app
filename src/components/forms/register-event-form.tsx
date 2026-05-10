"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TierOption = {
  id: string;
  name: string;
  priceCents: number;
  opensAt: string | null;
  closesAt: string | null;
  memberOnly: boolean;
};

export type VehicleOption = {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
};

type NewVehicleRow = {
  year: string;
  make: string;
  model: string;
  trim: string;
  notes: string;
};

export function RegisterEventForm({
  eventId,
  eventName,
  initialTiers,
  initialVehicles,
}: {
  eventId: string;
  eventName: string;
  initialTiers: TierOption[];
  initialVehicles: VehicleOption[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [tierId, setTierId] = useState(initialTiers[0]?.id ?? "");
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(
    () => new Set()
  );
  const [newRows, setNewRows] = useState<NewVehicleRow[]>([]);

  function toggleVehicle(id: string) {
    setSelectedVehicles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addBlankRow() {
    setNewRows((r) => [
      ...r,
      { year: "", make: "", model: "", trim: "", notes: "" },
    ]);
  }

  function updateRow(i: number, patch: Partial<NewVehicleRow>) {
    setNewRows((rows) =>
      rows.map((row, j) => (j === i ? { ...row, ...patch } : row))
    );
  }

  function removeRow(i: number) {
    setNewRows((rows) => rows.filter((_, j) => j !== i));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const vehicleIds = [...selectedVehicles];
    const newVehicles = newRows
      .map((row) => ({
        year: parseInt(row.year, 10),
        make: row.make.trim(),
        model: row.model.trim(),
        trim: row.trim.trim() || undefined,
        notes: row.notes.trim() || undefined,
      }))
      .filter((v) => !Number.isNaN(v.year) && v.make && v.model);

    if (vehicleIds.length === 0 && newVehicles.length === 0) {
      setError("Select at least one vehicle or add vehicle details below.");
      setSubmitting(false);
      return;
    }

    if (!tierId) {
      setError("Select a registration tier.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierId,
          vehicleIds,
          newVehicles: newVehicles.length ? newVehicles : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        return;
      }
      router.push(`/events/${eventId}`);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function formatMoney(cents: number) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  }

  if (initialTiers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No registration tiers yet</CardTitle>
          <CardDescription>
            The organizer hasn&apos;t opened registration pricing for this
            event.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={`/events/${eventId}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Back to event
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8 max-w-2xl mx-auto pb-12">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">Register for {eventName}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Choose a tier and the vehicle(s) you plan to bring.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registration tier</CardTitle>
          <CardDescription>
            Pay-at-the-gate flows will arrive with payments in the next phase.
            Paid tiers stay pending until then.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {initialTiers.map((t) => (
            <label
              key={t.id}
              className="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-[:checked]:border-primary"
            >
              <input
                type="radio"
                name="tier"
                value={t.id}
                checked={tierId === t.id}
                onChange={() => setTierId(t.id)}
                className="mt-1"
              />
              <span>
                <span className="font-medium">{t.name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  — {formatMoney(t.priceCents)}
                  {t.memberOnly ? " (club members)" : ""}
                </span>
              </span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your garage</CardTitle>
          <CardDescription>
            Select vehicles already saved to your profile. Manage them anytime
            from the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {initialVehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No saved vehicles yet — add details below.
            </p>
          ) : (
            <ul className="space-y-2">
              {initialVehicles.map((v) => (
                <li key={v.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedVehicles.has(v.id)}
                      onChange={() => toggleVehicle(v.id)}
                      className="rounded border border-input"
                    />
                    <span>
                      {v.year} {v.make} {v.model}
                      {v.trim ? ` ${v.trim}` : ""}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add vehicles for this registration</CardTitle>
          <CardDescription>
            Optional — use this for cars that aren&apos;t in your garage yet.
            They will be saved to your profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {newRows.map((row, i) => (
            <div
              key={i}
              className="grid gap-3 sm:grid-cols-2 border rounded-md p-3 relative"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1"
                onClick={() => removeRow(i)}
              >
                Remove
              </Button>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  required
                  value={row.year}
                  onChange={(e) => updateRow(i, { year: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Make</Label>
                <Input
                  value={row.make}
                  onChange={(e) =>
                    updateRow(i, { make: e.target.value.slice(0, 12) })
                  }
                  required
                  maxLength={12}
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={row.model}
                  onChange={(e) =>
                    updateRow(i, { model: e.target.value.slice(0, 20) })
                  }
                  required
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label>Trim (optional)</Label>
                <Input
                  value={row.trim}
                  onChange={(e) => updateRow(i, { trim: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notes (optional)</Label>
                <Input
                  value={row.notes}
                  onChange={(e) => updateRow(i, { notes: e.target.value })}
                />
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addBlankRow}>
            Add vehicle row
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit registration
        </Button>
        <Link
          href={`/events/${eventId}`}
          className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
