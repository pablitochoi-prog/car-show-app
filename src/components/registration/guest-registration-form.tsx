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
  User,
} from "lucide-react";
import { isTierOpen, formatMoney, formatDate } from "./reg-utils";
import {
  VehicleLookupFields,
  type VehicleLookupValues,
} from "@/components/forms/vehicle-lookup-fields";
import { formatUSPhoneDigits, digitsFromPhoneInput } from "@/lib/phone-us";
import type { TierOption } from "./event-registration-page";

type GuestVehicleRow = {
  year: string;
  make: string;
  model: string;
  trim: string;
  notes: string;
};

export function GuestRegistrationForm({
  eventId,
  tiers,
  feeType,
  feeDollars,
}: {
  eventId: string;
  tiers: TierOption[];
  feeType: string | null;
  feeDollars: number | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const singleTier = tiers.length === 1 ? tiers[0] : null;
  const [tierId, setTierId] = useState(() => {
    if (singleTier) return singleTier.id;
    const firstOpen = tiers.find((t) => isTierOpen(t));
    return firstOpen?.id ?? tiers[0]?.id ?? "";
  });

  const [vehicles, setVehicles] = useState<GuestVehicleRow[]>([
    { year: "", make: "", model: "", trim: "", notes: "" },
  ]);

  function addRow() {
    setVehicles((r) => [
      ...r,
      { year: "", make: "", model: "", trim: "", notes: "" },
    ]);
  }

  function updateRow(i: number, patch: Partial<GuestVehicleRow>) {
    setVehicles((rows) =>
      rows.map((row, j) => (j === i ? { ...row, ...patch } : row)),
    );
  }

  function removeRow(i: number) {
    setVehicles((rows) => rows.filter((_, j) => j !== i));
  }

  const selectedTier = tiers.find((t) => t.id === tierId);
  const validVehicles = vehicles.filter((r) => r.make && r.model && r.year);

  async function handleGuestSubmit() {
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!tierId) {
      setError("Please select a registration tier.");
      return;
    }
    if (validVehicles.length === 0) {
      setError("Add at least one vehicle.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/events/${eventId}/register-guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          vehicles: validVehicles.map((v) => ({
            year: parseInt(v.year, 10),
            make: v.make.trim(),
            model: v.model.trim(),
            trim: v.trim.trim() || undefined,
            notes: v.notes.trim() || undefined,
          })),
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
        `/events/${eventId}/register/success?status=${data.status ?? "CONFIRMED"}&tier=${encodeURIComponent(selectedTier?.name ?? "")}&count=${validVehicles.length}`,
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ---- Contact Information ---- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="guest-fn" className="text-xs">
                First Name *
              </Label>
              <Input
                id="guest-fn"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                maxLength={100}
                className="h-9"
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guest-ln" className="text-xs">
                Last Name *
              </Label>
              <Input
                id="guest-ln"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                maxLength={100}
                className="h-9"
                autoComplete="family-name"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="guest-email" className="text-xs">
                Email *
              </Label>
              <Input
                id="guest-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-9"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guest-phone" className="text-xs">
                Phone
              </Label>
              <Input
                id="guest-phone"
                type="tel"
                value={formatUSPhoneDigits(phone)}
                onChange={(e) => setPhone(digitsFromPhoneInput(e.target.value))}
                placeholder="(###) ###-####"
                className="h-9"
                autoComplete="tel"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---- Vehicle Information ---- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Vehicle Information
            {validVehicles.length > 0 && (
              <Badge variant="default" className="ml-2">
                {validVehicles.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {vehicles.map((row, i) => (
            <div
              key={i}
              className="relative rounded-lg border bg-card p-3 shadow-sm"
            >
              {vehicles.length > 1 && (
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
              )}

              <VehicleLookupFields
                idPrefix={`gv-${i}`}
                values={row}
                onChange={(v: VehicleLookupValues) => updateRow(i, v)}
              />

              <div className="mt-2 space-y-1">
                <Label className="text-xs">Your Vehicle Story</Label>
                <Input
                  placeholder="Tell us about your vehicle"
                  value={row.notes}
                  onChange={(e) => updateRow(i, { notes: e.target.value })}
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
            onClick={addRow}
          >
            <Plus className="size-4" />
            Add another vehicle
          </Button>
        </CardContent>
      </Card>

      {/* ---- Tier Selection (only for tiered pricing) ---- */}
      {feeType === "PAID_TIERED" && (
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
                        open && !active && "border-border hover:border-primary/40",
                        active && "border-primary bg-primary/5",
                        !open && "cursor-not-allowed border-border bg-muted/50 opacity-60",
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
                        {t.priceCents === 0 ? "Free" : formatMoney(t.priceCents)}
                      </span>
                      {(t.opensAt || t.closesAt) && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="size-3 shrink-0" />
                          {!open ? (
                            <span>
                              {t.opensAt && new Date(t.opensAt) > new Date()
                                ? `Opens ${formatDate(t.opensAt)}`
                                : "Closed"}
                            </span>
                          ) : (
                            <span>
                              {t.closesAt ? `Closes ${formatDate(t.closesAt)}` : "Open now"}
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
          <CardTitle className="text-base">Review &amp; Submit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {validVehicles.length > 0 && (
            <ul className="space-y-1 text-sm">
              {validVehicles.map((v, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Car className="size-3.5 text-muted-foreground" />
                  <span>
                    {v.year} {v.make} {v.model}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Fee summary */}
          {(() => {
            const numVehicles = validVehicles.length;
            if (feeType === "FREE") {
              return (
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="size-4 text-muted-foreground" />
                  <span className="font-medium">Free</span>
                </div>
              );
            }
            if (feeType === "PAID_TIERED" && selectedTier) {
              const unitCents = selectedTier.priceCents;
              const total = unitCents * numVehicles;
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
                        : `${formatMoney(unitCents)} \u00d7 ${numVehicles} vehicle${numVehicles !== 1 ? "s" : ""} = ${formatMoney(total)}`}
                    </span>
                  </div>
                </div>
              );
            }
            if (feeType === "DONATION") {
              const unitCents = (feeDollars ?? 0) * 100;
              const total = unitCents * numVehicles;
              return (
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="size-4 text-muted-foreground" />
                  <span className="font-bold">
                    {unitCents === 0
                      ? "Donation"
                      : `Donation ${formatMoney(unitCents)} \u00d7 ${numVehicles} vehicle${numVehicles !== 1 ? "s" : ""} = ${formatMoney(total)}`}
                  </span>
                </div>
              );
            }
            /* PAID (Flat Rate) */
            const unitCents = (feeDollars ?? 0) * 100;
            const total = unitCents * numVehicles;
            return (
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="size-4 text-muted-foreground" />
                <span className="font-bold">
                  {unitCents === 0
                    ? "Free"
                    : `Registration fee ${formatMoney(unitCents)} \u00d7 ${numVehicles} vehicle${numVehicles !== 1 ? "s" : ""} = ${formatMoney(total)}`}
                </span>
              </div>
            );
          })()}

          {((feeType === "PAID_TIERED" && selectedTier && selectedTier.priceCents > 0) ||
            (feeType === "PAID" && (feeDollars ?? 0) > 0) ||
            (feeType === "DONATION" && (feeDollars ?? 0) > 0)) && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Payment will be collected at a later step. Your registration will
              be marked as Pending.
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
            disabled={
              submitting ||
              !tierId ||
              validVehicles.length === 0 ||
              !firstName.trim() ||
              !lastName.trim() ||
              !email.trim()
            }
            onClick={() => void handleGuestSubmit()}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Register as Guest
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
