"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, ArrowLeft, ArrowRight, MapPin, Calendar } from "lucide-react";
import { StepIndicator } from "./step-indicator";
import { TierStep, type TierOption } from "./tier-step";
import { VehicleStep, type VehicleOption, type NewVehicleRow } from "./vehicle-step";
import { ReviewStep } from "./review-step";
import { isTierOpen } from "./reg-utils";

export type EventInfo = {
  id: string;
  name: string;
  startDate: string;
  startTime: string | null;
  city: string | null;
  state: string | null;
  venue: string | null;
};

export function RegistrationWizard({
  event,
  tiers,
  vehicles,
}: {
  event: EventInfo;
  tiers: TierOption[];
  vehicles: VehicleOption[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Step 1 state
  const [tierId, setTierId] = useState(() => {
    const firstOpen = tiers.find((t) => isTierOpen(t));
    return firstOpen?.id ?? tiers[0]?.id ?? "";
  });

  // Step 2 state
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [newRows, setNewRows] = useState<NewVehicleRow[]>([]);

  function toggleVehicle(id: string) {
    setSelectedVehicles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedTier = tiers.find((t) => t.id === tierId);
  const garageVehicles = vehicles.filter((v) => selectedVehicles.has(v.id));
  const validNewRows = newRows.filter((r) => r.make && r.model && r.year);
  const totalVehicles = garageVehicles.length + validNewRows.length;

  function canAdvance(): boolean {
    if (step === 0) return !!tierId && !!selectedTier && isTierOpen(selectedTier);
    if (step === 1) return totalVehicles > 0;
    return true;
  }

  function stepError(): string {
    if (step === 0 && !tierId) return "Please select a registration tier.";
    if (step === 1 && totalVehicles === 0)
      return "Select at least one vehicle or add a new one.";
    return "";
  }

  function handleNext() {
    const err = stepError();
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => Math.min(s + 1, 2));
  }

  function handleBack() {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    setError("");
    setSubmitting(true);

    const vehicleIds = [...selectedVehicles];
    const newVehicles = validNewRows.map((row) => ({
      year: parseInt(row.year, 10),
      make: row.make.trim(),
      model: row.model.trim(),
      trim: row.trim.trim() || undefined,
      vin: row.vin.trim() || undefined,
      notes: row.notes.trim() || undefined,
    }));

    try {
      const res = await fetch(`/api/events/${event.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierId,
          vehicleIds,
          newVehicles: newVehicles.length ? newVehicles : undefined,
        }),
      });
      const data = (await res.json()) as { id?: string; status?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        return;
      }
      router.push(
        `/events/${event.id}/register/success?status=${data.status ?? "CONFIRMED"}&tier=${encodeURIComponent(selectedTier?.name ?? "")}&count=${totalVehicles}`,
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (tiers.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 rounded-xl border p-8 text-center">
        <h2 className="text-xl font-semibold">Registration not yet open</h2>
        <p className="text-sm text-muted-foreground">
          The organizer hasn&apos;t set up registration tiers for this event yet.
        </p>
        <Link
          href={`/events/${event.id}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Back to event
        </Link>
      </div>
    );
  }

  const eventDate = new Date(event.startDate).toLocaleDateString(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const location = [event.venue, event.city, event.state].filter(Boolean).join(", ");

  return (
    <div className="mx-auto max-w-2xl pb-12">
      {/* Event context header */}
      <div className="mb-6 rounded-xl border bg-card p-4">
        <h1 className="text-xl font-bold">{event.name}</h1>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {eventDate}
            {event.startTime ? ` · ${event.startTime}` : ""}
          </span>
          {location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {location}
            </span>
          )}
        </div>
      </div>

      <StepIndicator current={step} />

      {error && (
        <div className="mb-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step content */}
      {step === 0 && (
        <TierStep tiers={tiers} selected={tierId} onSelect={setTierId} />
      )}
      {step === 1 && (
        <VehicleStep
          vehicles={vehicles}
          selected={selectedVehicles}
          onToggle={toggleVehicle}
          newRows={newRows}
          onNewRowsChange={setNewRows}
        />
      )}
      {step === 2 && (
        <ReviewStep
          tier={selectedTier}
          selectedVehicles={garageVehicles}
          newVehicles={newRows}
          eventName={event.name}
        />
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <div>
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={handleBack} className="gap-2">
              <ArrowLeft className="size-4" />
              Back
            </Button>
          ) : (
            <Link
              href={`/events/${event.id}`}
              className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
            >
              <ArrowLeft className="size-4" />
              Cancel
            </Link>
          )}
        </div>
        <div>
          {step < 2 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canAdvance()}
              className="gap-2"
            >
              Next
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || !canAdvance()}
              className="gap-2"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Submit Registration
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
