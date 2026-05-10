"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Check,
  Car,
  Plus,
  X,
  Tag,
  CreditCard,
  Clock,
  Users,
} from "lucide-react";
import { InlineLogin } from "./inline-login";
import { EventInfoSidebar, type SidebarEvent } from "./event-info-sidebar";
import { GuestRegistrationForm } from "./guest-registration-form";
import { isTierOpen, formatMoney, formatDate } from "./reg-utils";
import {
  VehicleLookupFields,
  type VehicleLookupValues,
} from "@/components/forms/vehicle-lookup-fields";
import { ThumbnailWithEye, ImageLightbox } from "@/components/ui/image-lightbox";

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

export function EventRegistrationPage({
  event,
  tiers,
  vehicles,
  isLoggedIn,
}: {
  event: SidebarEvent & { id: string; description: string | null; status: string };
  tiers: TierOption[];
  vehicles: VehicleOption[];
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const singleTier = tiers.length === 1 ? tiers[0] : null;
  const [tierId, setTierId] = useState(() => {
    if (singleTier) return singleTier.id;
    const firstOpen = tiers.find((t) => isTierOpen(t));
    return firstOpen?.id ?? tiers[0]?.id ?? "";
  });

  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(
    new Set(),
  );
  const [newRows, setNewRows] = useState<NewVehicleRow[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

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
      rows.map((row, j) => (j === i ? { ...row, ...patch } : row)),
    );
  }

  function removeRow(i: number) {
    setNewRows((rows) => rows.filter((_, j) => j !== i));
  }

  const selectedTier = tiers.find((t) => t.id === tierId);
  const garageVehicles = vehicles.filter((v) => selectedVehicles.has(v.id));
  const validNewRows = newRows.filter((r) => r.make && r.model && r.year);
  const totalVehicles = garageVehicles.length + validNewRows.length;

  const canRegister =
    ["PUBLISHED", "ACTIVE"].includes(event.status) && tiers.length > 0;

  async function handleSubmit() {
    if (!tierId) {
      setError("Please select a registration tier.");
      return;
    }
    if (totalVehicles === 0) {
      setError("Select at least one vehicle or add a new one.");
      return;
    }

    setError("");
    setSubmitting(true);

    const vehicleIds = [...selectedVehicles];
    const newVehicles = validNewRows.map((row) => ({
      year: parseInt(row.year, 10),
      make: row.make.trim(),
      model: row.model.trim(),
      trim: row.trim.trim() || undefined,
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
      const data = (await res.json()) as {
        id?: string;
        status?: string;
        error?: string;
      };
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* ---- LEFT COLUMN: Registration form ---- */}
        <div className="space-y-6" id="register">
          {/* ---- Header: Flyer + Event Name/Description ---- */}
          <div className="flex gap-4">
            {event.flyerUrl && (
              <ThumbnailWithEye onClick={() => setLightboxSrc(event.flyerUrl)}>
                <img
                  src={event.flyerUrl}
                  alt="Event flyer"
                  className="h-24 w-[4.5rem] rounded-lg border object-cover shadow-sm sm:h-[7.5rem] sm:w-[5.25rem]"
                />
              </ThumbnailWithEye>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold leading-tight">{event.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {canRegister
                  ? "Complete the form below to register."
                  : "Registration is not currently open for this event."}
              </p>
              {event.description && (
                <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
                  {event.description}
                </p>
              )}
            </div>
          </div>

          {/* Auth + guest registration for non-logged-in visitors */}
          {!isLoggedIn && canRegister && (
            <>
              <InlineLogin redirectPath={`/events/${event.id}`} />

              <div className="relative flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  or continue as a guest
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <GuestRegistrationForm
                eventId={event.id}
                tiers={tiers}
                feeType={event.registrationFeeType}
                feeDollars={event.registrationFeeDollars}
              />
            </>
          )}

          {!isLoggedIn && !canRegister && (
            <InlineLogin redirectPath={`/events/${event.id}`} />
          )}

          {canRegister && isLoggedIn && (
            <>
              {/* ---- Vehicle Selection ---- */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Vehicle Information
                    {totalVehicles > 0 && (
                      <Badge variant="default" className="ml-2">
                        {totalVehicles} selected
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Garage vehicles */}
                  {vehicles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Your Garage
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {vehicles.map((v) => {
                          const active = selectedVehicles.has(v.id);
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => toggleVehicle(v.id)}
                              className={cn(
                                "flex items-center gap-2.5 rounded-lg border-2 px-3 py-2.5 text-left text-sm transition-all",
                                active
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/40",
                              )}
                            >
                              <div
                                className={cn(
                                  "flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                                  active
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/40",
                                )}
                              >
                                {active && <Check className="size-3" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium leading-snug">
                                  {v.year} {v.make} {v.model}
                                </p>
                                {v.trim && (
                                  <p className="text-xs text-muted-foreground">
                                    {v.trim}
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {vehicles.length === 0 && newRows.length === 0 && (
                    <div className="rounded-lg border-2 border-dashed p-6 text-center">
                      <Car className="mx-auto mb-2 size-6 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        No saved vehicles. Add your vehicle below.
                      </p>
                    </div>
                  )}

                  {/* New vehicle rows */}
                  {newRows.map((row, i) => (
                    <div
                      key={i}
                      className="relative rounded-lg border bg-card p-3 shadow-sm"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1.5 top-1.5 size-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeRow(i)}
                        aria-label="Remove vehicle"
                      >
                        <X className="size-3.5" />
                      </Button>

                      <VehicleLookupFields
                        idPrefix={`nv-${i}`}
                        values={row}
                        onChange={(v: VehicleLookupValues) =>
                          updateRow(i, v)
                        }
                      />

                      <div className="mt-2 space-y-1">
                        <Label className="text-xs">Your Vehicle Story</Label>
                        <Input
                          placeholder="Tell us about your vehicle"
                          value={row.notes}
                          onChange={(e) =>
                            updateRow(i, { notes: e.target.value })
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={addBlankRow}
                  >
                    <Plus className="size-4" />
                    Add a vehicle
                  </Button>
                </CardContent>
              </Card>

              {/* ---- Registration Tier (only for tiered pricing) ---- */}
              {event.registrationFeeType === "PAID_TIERED" && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Registration Tier</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {singleTier ? (
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <Tag className="size-4 text-muted-foreground" />
                          <span className="font-medium">{singleTier.name}</span>
                        </div>
                        <span className="text-lg font-bold">
                          {singleTier.priceCents === 0
                            ? "Free"
                            : formatMoney(singleTier.priceCents)}
                        </span>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {tiers.map((t) => {
                          const open = isTierOpen(t);
                          const active = tierId === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              disabled={!open}
                              onClick={() => setTierId(t.id)}
                              className={cn(
                                "relative flex flex-col gap-1.5 rounded-xl border-2 p-3 text-left transition-all",
                                open && !active &&
                                  "border-border hover:border-primary/40",
                                active && "border-primary bg-primary/5",
                                !open &&
                                  "cursor-not-allowed border-border bg-muted/50 opacity-60",
                              )}
                            >
                              {active && (
                                <div className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                  <Check className="size-3" />
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{t.name}</span>
                                {t.memberOnly && (
                                  <Badge variant="secondary" className="gap-1 text-[10px]">
                                    <Users className="size-3" />
                                    Members
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xl font-bold">
                                {t.priceCents === 0
                                  ? "Free"
                                  : formatMoney(t.priceCents)}
                              </span>
                              {(t.opensAt || t.closesAt) && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Clock className="size-3 shrink-0" />
                                  {!open ? (
                                    <span>
                                      {t.opensAt &&
                                      new Date(t.opensAt) > new Date()
                                        ? `Opens ${formatDate(t.opensAt)}`
                                        : "Closed"}
                                    </span>
                                  ) : (
                                    <span>
                                      {t.closesAt
                                        ? `Closes ${formatDate(t.closesAt)}`
                                        : "Open now"}
                                    </span>
                                  )}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ---- Review & Submit ---- */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Review &amp; Submit
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {totalVehicles > 0 && (
                    <ul className="space-y-1 text-sm">
                      {garageVehicles.map((v) => (
                        <li key={v.id} className="flex items-center gap-2">
                          <Car className="size-3.5 text-muted-foreground" />
                          <span>
                            {v.year} {v.make} {v.model}
                          </span>
                          {v.trim && (
                            <span className="text-muted-foreground">
                              {v.trim}
                            </span>
                          )}
                        </li>
                      ))}
                      {validNewRows.map((v, i) => (
                        <li
                          key={`new-${i}`}
                          className="flex items-center gap-2"
                        >
                          <Car className="size-3.5 text-muted-foreground" />
                          <span>
                            {v.year} {v.make} {v.model}
                          </span>
                          <Badge variant="default" className="text-[10px]">
                            New
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Fee summary */}
                  {(() => {
                    const ft = event.registrationFeeType;
                    if (ft === "FREE") {
                      return (
                        <div className="flex items-center gap-2 text-sm">
                          <CreditCard className="size-4 text-muted-foreground" />
                          <span className="font-medium">Free</span>
                        </div>
                      );
                    }
                    if (ft === "PAID_TIERED" && selectedTier) {
                      const unitCents = selectedTier.priceCents;
                      const total = unitCents * totalVehicles;
                      return (
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Tag className="size-4 text-muted-foreground" />
                            <span className="font-medium">{selectedTier.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CreditCard className="size-4 text-muted-foreground" />
                            <span className="font-bold">
                              {unitCents === 0
                                ? "Free"
                                : `${formatMoney(unitCents)} \u00d7 ${totalVehicles} vehicle${totalVehicles !== 1 ? "s" : ""} = ${formatMoney(total)}`}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    if (ft === "DONATION") {
                      const unitCents = (event.registrationFeeDollars ?? 0) * 100;
                      const total = unitCents * totalVehicles;
                      return (
                        <div className="flex items-center gap-2 text-sm">
                          <CreditCard className="size-4 text-muted-foreground" />
                          <span className="font-bold">
                            {unitCents === 0
                              ? "Donation"
                              : `Donation ${formatMoney(unitCents)} \u00d7 ${totalVehicles} vehicle${totalVehicles !== 1 ? "s" : ""} = ${formatMoney(total)}`}
                          </span>
                        </div>
                      );
                    }
                    /* PAID (Flat Rate) */
                    const unitCents = (event.registrationFeeDollars ?? 0) * 100;
                    const total = unitCents * totalVehicles;
                    return (
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="size-4 text-muted-foreground" />
                        <span className="font-bold">
                          {unitCents === 0
                            ? "Free"
                            : `Registration fee ${formatMoney(unitCents)} \u00d7 ${totalVehicles} vehicle${totalVehicles !== 1 ? "s" : ""} = ${formatMoney(total)}`}
                        </span>
                      </div>
                    );
                  })()}

                  {((event.registrationFeeType === "PAID_TIERED" && selectedTier && selectedTier.priceCents > 0) ||
                    (event.registrationFeeType === "PAID" && (event.registrationFeeDollars ?? 0) > 0) ||
                    (event.registrationFeeType === "DONATION" && (event.registrationFeeDollars ?? 0) > 0)) && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Payment will be collected at a later step. Your
                      registration will be marked as Pending.
                    </p>
                  )}

                  {error && (
                    <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <Button
                    type="button"
                    size="lg"
                    className="w-full gap-2"
                    disabled={submitting || !tierId || totalVehicles === 0}
                    onClick={() => void handleSubmit()}
                  >
                    {submitting && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    Submit Registration
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {!canRegister && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  {tiers.length === 0
                    ? "The organizer hasn't set up registration tiers for this event yet."
                    : "Registration is not currently open for this event."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ---- RIGHT COLUMN: Sticky sidebar ---- */}
        <aside className="hidden lg:block">
          <div className="sticky top-4 rounded-xl border bg-card p-5">
            <EventInfoSidebar event={event} />
          </div>
        </aside>

        {/* Mobile: event info accordion at top (rendered before form via CSS order) */}
        <details className="order-first rounded-xl border bg-card p-4 lg:hidden">
          <summary className="cursor-pointer text-sm font-semibold">
            Event Details
          </summary>
          <div className="mt-3">
            <EventInfoSidebar event={event} />
          </div>
        </details>
      </div>

      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt="Event flyer"
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </div>
  );
}
