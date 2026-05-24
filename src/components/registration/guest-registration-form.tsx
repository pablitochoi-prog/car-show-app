"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Check,
  Car,
  Plus,
  Trash2,
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
import type { TierOption, PlatformFeeInfo } from "./event-registration-page";
import {
  parseDonationDollarsInput,
  suggestedDonationDollarsInput,
  suggestedDonationTotalDollars,
} from "@/lib/donation";
import { DonationAmountField } from "./donation-amount-field";
import { totalPlatformFeeForCheckout, type EventPlatformFeeMode } from "@/lib/event-platform-fee";
import { dollarsToCents } from "@/lib/money";
import { GuestVehiclePhoto } from "./guest-vehicle-photo";
import { RequiredFieldMark } from "./required-field-mark";
import { VehicleClassSelect } from "./vehicle-class-select";
import {
  REGISTRATION_CLASS_REQUIRED_MSG,
  REGISTRATION_VEHICLE_REQUIRED_MSG,
  guestVehiclesHaveRequiredClasses,
} from "@/lib/registration-vehicle-classes";
import { hasCompleteMailingAddress } from "@/lib/registration-address";
import { RegistrationAddressFields } from "./registration-address-fields";

type EventCategoryOption = { id: string; name: string };

type RegisteredGuestVehicle = {
  clientId: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  nickname: string;
  notes: string;
  photoUrl: string | null;
  eventCategoryId: string | null;
};

const emptyDraft = (): VehicleLookupValues & { notes: string; nickname: string } => ({
  year: "",
  make: "",
  model: "",
  trim: "",
  nickname: "",
  notes: "",
});

type CheckoutMode = "guest_pay" | "create_account" | "free";

export function GuestRegistrationForm({
  eventId,
  tiers,
  feeType,
  feeDollars,
  stripeConnectReady,
  platformFee,
  platformFeeMode = "CONVENIENCE",
  platformSetupFeeCollected = false,
  eventSetupFeeCents = 0,
  eventCategories = [],
}: {
  eventId: string;
  tiers: TierOption[];
  feeType: string | null;
  feeDollars: number | null;
  /** Stripe Connect can accept charges for this event. */
  stripeConnectReady: boolean;
  platformFee: PlatformFeeInfo;
  platformFeeMode?: EventPlatformFeeMode;
  platformSetupFeeCollected?: boolean;
  eventSetupFeeCents?: number;
  eventCategories?: EventCategoryOption[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<CheckoutMode | null>(null);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  const singleTier = tiers.length === 1 ? tiers[0] : null;
  const [tierId, setTierId] = useState(() => {
    if (singleTier) return singleTier.id;
    const firstOpen = tiers.find((t) => isTierOpen(t));
    return firstOpen?.id ?? tiers[0]?.id ?? "";
  });

  const [draft, setDraft] = useState(emptyDraft);
  const [registeredVehicles, setRegisteredVehicles] = useState<
    RegisteredGuestVehicle[]
  >([]);

  const isDonationEvent = feeType === "DONATION";
  const requiresVehicleClass = eventCategories.length > 0;
  const categoryNameById = Object.fromEntries(
    eventCategories.map((c) => [c.id, c.name]),
  );
  function guestVehicleClassLabel(eventCategoryId: string | null): string {
    if (!eventCategoryId) {
      return requiresVehicleClass ? "Not selected" : "—";
    }
    return categoryNameById[eventCategoryId] ?? "—";
  }
  const [donationDollars, setDonationDollars] = useState(() =>
    suggestedDonationDollarsInput(feeDollars, 1),
  );
  const prevVehicleCountRef = useRef(1);

  const selectedTier = tiers.find((t) => t.id === tierId);
  const vehicleCount = Math.max(registeredVehicles.length, 1);

  useEffect(() => {
    if (!isDonationEvent) return;
    const prev = prevVehicleCountRef.current;
    if (prev === vehicleCount) return;
    const oldSuggested = suggestedDonationTotalDollars(feeDollars, prev);
    prevVehicleCountRef.current = vehicleCount;
    setDonationDollars((d) => {
      const cents = parseDonationDollarsInput(d);
      if (d.trim() === "" || cents === Math.round(oldSuggested * 100)) {
        return suggestedDonationDollarsInput(feeDollars, vehicleCount);
      }
      return d;
    });
  }, [isDonationEvent, vehicleCount, feeDollars]);

  const guestDonationCents = isDonationEvent
    ? parseDonationDollarsInput(donationDollars) ?? 0
    : 0;

  const guestFeeUnitCents = (() => {
    if (isDonationEvent) return dollarsToCents(feeDollars ?? 0);
    if (feeType === "PAID_TIERED" && selectedTier) return selectedTier.priceCents;
    return dollarsToCents(feeDollars ?? 0);
  })();

  const guestPlatformFees = totalPlatformFeeForCheckout({
    mode: platformFeeMode,
    platformFee: platformFee ?? {
      type: "NONE",
      amountCents: null,
      percent: null,
    },
    unitPriceCents: guestFeeUnitCents,
    vehicleCount,
    setupFeeCents: eventSetupFeeCents,
    setupFeeCollected: platformSetupFeeCollected,
  });

  const guestPlatformFee = {
    perVehicleCents: guestPlatformFees.perVehiclePlatformFeeCents,
    totalCents:
      guestPlatformFees.perVehiclePlatformFeeCents * Math.max(vehicleCount, 1) +
      guestPlatformFees.flatSetupFeeCents,
    flatSetupCents: guestPlatformFees.flatSetupFeeCents,
  };
  const guestGrandTotal = guestDonationCents + guestPlatformFee.totalCents;

  function draftIsValid() {
    return Boolean(draft.make && draft.model && draft.year);
  }

  function addDraftToRegistration() {
    if (!draftIsValid()) {
      setError("Enter year, make, and model before adding a vehicle.");
      return;
    }
    setError("");
    setRegisteredVehicles((prev) => [
      ...prev,
      {
        clientId: crypto.randomUUID(),
        year: parseInt(draft.year, 10),
        make: draft.make.trim(),
        model: draft.model.trim(),
        trim: draft.trim.trim(),
        nickname: draft.nickname.trim(),
        notes: draft.notes.trim(),
        photoUrl: null,
        eventCategoryId: null,
      },
    ]);
    setDraft(emptyDraft());
  }

  function removeVehicle(clientId: string) {
    setRegisteredVehicles((prev) => prev.filter((v) => v.clientId !== clientId));
  }

  function updateVehicle(
    clientId: string,
    patch: Partial<RegisteredGuestVehicle>,
  ) {
    setRegisteredVehicles((prev) =>
      prev.map((v) => (v.clientId === clientId ? { ...v, ...patch } : v)),
    );
  }

  /** Event charges a registration fee (independent of Stripe setup). */
  function hasRegistrationFee() {
    if (isDonationEvent) {
      return guestGrandTotal > 0;
    }
    if (feeType === "FREE") return false;
    if (feeType === "PAID_TIERED" && selectedTier) {
      return selectedTier.priceCents > 0;
    }
    if (feeType === "PAID") {
      return (feeDollars ?? 0) > 0;
    }
    return false;
  }

  function canCollectPaymentOnline() {
    return stripeConnectReady && hasRegistrationFee();
  }

  function validateBeforeSubmit() {
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return false;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return false;
    }
    if (
      !hasCompleteMailingAddress({
        street,
        city,
        state,
        zip,
      })
    ) {
      setError("Street address, city, state, and zip are required.");
      return false;
    }
    if (!tierId) {
      setError("Please select a registration tier.");
      return false;
    }
    if (registeredVehicles.length === 0) {
      setError(REGISTRATION_VEHICLE_REQUIRED_MSG);
      return false;
    }
    if (
      requiresVehicleClass &&
      !guestVehiclesHaveRequiredClasses(requiresVehicleClass, registeredVehicles)
    ) {
      setError(REGISTRATION_CLASS_REQUIRED_MSG);
      return false;
    }
    if (
      isDonationEvent &&
      hasRegistrationFee() &&
      (parseDonationDollarsInput(donationDollars) ?? 0) <= 0
    ) {
      setError("Enter a donation amount greater than $0 to continue to payment.");
      return false;
    }
    return true;
  }

  async function startCheckout(registrationId: string) {
    const checkoutRes = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId }),
    });
    const checkoutData = (await checkoutRes.json()) as {
      checkoutUrl?: string;
      error?: string;
    };
    if (!checkoutRes.ok || !checkoutData.checkoutUrl) {
      setError(checkoutData.error ?? "Failed to start checkout.");
      return false;
    }
    window.location.href = checkoutData.checkoutUrl;
    return true;
  }

  async function handleGuestSubmit(mode: CheckoutMode) {
    if (!validateBeforeSubmit()) return;

    if (
      (mode === "guest_pay" || mode === "create_account") &&
      hasRegistrationFee() &&
      !stripeConnectReady
    ) {
      setError(
        "Online payment is not available for this event yet. Contact the organizer.",
      );
      return;
    }

    setError("");
    setSubmitting(mode);

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
          street: street.trim(),
          city: city.trim(),
          state: state.trim().toUpperCase(),
          zip: zip.trim(),
          vehicles: registeredVehicles.map((v) => ({
            year: v.year,
            make: v.make,
            model: v.model,
            trim: v.trim || undefined,
            nickname: v.nickname.trim() || undefined,
            notes: v.notes || undefined,
            photoUrl: v.photoUrl ?? undefined,
            eventCategoryId: v.eventCategoryId ?? undefined,
          })),
          ...(isDonationEvent
            ? {
                donationCents: parseDonationDollarsInput(donationDollars) ?? 0,
              }
            : {}),
        }),
      });
      const data = (await res.json()) as {
        id?: string;
        status?: string;
        checkoutRequired?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        return;
      }

      if (mode === "create_account" && data.id) {
        const q = new URLSearchParams({
          registrationId: data.id,
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
        if (phone.trim()) q.set("phone", phone.trim());
        if (data.checkoutRequired) q.set("checkout", "1");
        router.push(
          `/events/${eventId}/register/create-account?${q.toString()}`,
        );
        return;
      }

      if (data.id && mode === "guest_pay" && hasRegistrationFee()) {
        if (data.checkoutRequired) {
          await startCheckout(data.id);
          return;
        }
        setError(
          "Payment could not be started. The organizer may need to finish Stripe setup.",
        );
        return;
      }

      router.push(
        `/events/${eventId}/register/success?status=${data.status ?? "CONFIRMED"}&tier=${encodeURIComponent(selectedTier?.name ?? "")}&count=${registeredVehicles.length}`,
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(null);
    }
  }

  const payRequired = hasRegistrationFee();
  const checkoutReady = canCollectPaymentOnline();

  function feeSummaryBlock() {
    if (isDonationEvent) {
      return (
        <div className="space-y-3 text-sm">
          <DonationAmountField
            value={donationDollars}
            onChange={setDonationDollars}
            suggestedPerVehicleDollars={feeDollars}
            vehicleCount={vehicleCount}
            disabled={!!submitting}
            id="guest-review-donation-amount"
          />
          {guestPlatformFee.perVehicleCents > 0 && (
            <div className="flex items-center justify-between gap-2 border-t pt-2">
              <span>Registration fee:</span>
              <span className="text-right font-medium">
                {formatMoney(guestPlatformFee.perVehicleCents)} × {vehicleCount}{" "}
                vehicle
                {vehicleCount !== 1 ? "s" : ""} ={" "}
                {formatMoney(
                  guestPlatformFee.perVehicleCents * Math.max(vehicleCount, 1),
                )}
              </span>
            </div>
          )}
          {guestPlatformFee.flatSetupCents > 0 && (
            <div className="flex items-center justify-between gap-2 border-t pt-2">
              <span>Platform setup fee:</span>
              <span className="text-right font-medium">
                {formatMoney(guestPlatformFee.flatSetupCents)}
              </span>
            </div>
          )}
          {(guestDonationCents > 0 || guestPlatformFee.totalCents > 0) && (
            <div className="flex items-center justify-between gap-2 border-t pt-1 font-bold">
              <span>Total:</span>
              <span>{formatMoney(guestGrandTotal)}</span>
            </div>
          )}
        </div>
      );
    }

    const numVehicles = Math.max(registeredVehicles.length, 1);
    if (feeType === "FREE") {
      return (
        <div className="flex items-center gap-2 text-sm">
          <CreditCard className="size-4 text-muted-foreground" />
          <span className="font-medium">Free</span>
        </div>
      );
    }

    let unitCents = 0;
    let eventFeeLabel = "Event fee";
    if (feeType === "PAID_TIERED" && selectedTier) {
      unitCents = selectedTier.priceCents;
      eventFeeLabel = selectedTier.name;
    } else {
      unitCents = dollarsToCents(feeDollars ?? 0);
    }

    const eventFeeTotal = unitCents * numVehicles;
    const tierPlatformFees = totalPlatformFeeForCheckout({
      mode: platformFeeMode,
      platformFee: platformFee ?? {
        type: "NONE",
        amountCents: null,
        percent: null,
      },
      unitPriceCents: unitCents,
      vehicleCount: numVehicles,
      setupFeeCents: eventSetupFeeCents,
      setupFeeCollected: platformSetupFeeCollected,
    });
    const convFeeCents = tierPlatformFees.perVehiclePlatformFeeCents;
    const totalConvFee =
      tierPlatformFees.perVehiclePlatformFeeCents * numVehicles;
    const flatSetupFeeCents = tierPlatformFees.flatSetupFeeCents;
    const grandTotal = eventFeeTotal + totalConvFee + flatSetupFeeCents;

    if (unitCents === 0) {
      return (
        <div className="flex items-center gap-2 text-sm">
          <CreditCard className="size-4 text-muted-foreground" />
          <span className="font-medium">Free</span>
        </div>
      );
    }

    return (
      <div className="space-y-1 text-sm">
        {feeType === "PAID_TIERED" && selectedTier && (
          <div className="flex items-center gap-2">
            <Tag className="size-4 text-muted-foreground" />
            <span className="font-medium">{selectedTier.name}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <span>{eventFeeLabel}:</span>
          <span className="text-right font-medium">
            {formatMoney(unitCents)} × {numVehicles} vehicle
            {numVehicles !== 1 ? "s" : ""} = {formatMoney(eventFeeTotal)}
          </span>
        </div>
        {totalConvFee > 0 && (
          <div className="flex items-center justify-between gap-2">
            <span>Registration fee:</span>
            <span className="text-right font-medium">
              {formatMoney(convFeeCents)} × {numVehicles} vehicle
              {numVehicles !== 1 ? "s" : ""} = {formatMoney(totalConvFee)}
            </span>
          </div>
        )}
        {flatSetupFeeCents > 0 && (
          <div className="flex items-center justify-between gap-2">
            <span>Platform setup fee:</span>
            <span className="text-right font-medium">
              {formatMoney(flatSetupFeeCents)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 border-t pt-1 font-bold">
          <span>Total:</span>
          <span>{formatMoney(grandTotal)}</span>
        </div>
      </div>
    );
  }

  const formDisabled =
    !!submitting ||
    !tierId ||
    registeredVehicles.length === 0 ||
    (requiresVehicleClass &&
      !guestVehiclesHaveRequiredClasses(
        requiresVehicleClass,
        registeredVehicles,
      )) ||
    !firstName.trim() ||
    !lastName.trim() ||
    !email.trim() ||
    !hasCompleteMailingAddress({ street, city, state, zip });

  return (
    <div className="space-y-6">
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
          <RegistrationAddressFields
            idPrefix="guest"
            values={{ street, city, state, zip }}
            onChange={(patch) => {
              if (patch.street !== undefined) setStreet(patch.street);
              if (patch.city !== undefined) setCity(patch.city);
              if (patch.state !== undefined) setState(patch.state);
              if (patch.zip !== undefined) setZip(patch.zip);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add Vehicle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <VehicleLookupFields
            idPrefix="guest-draft"
            values={draft}
            onChange={(v) => setDraft((d) => ({ ...d, ...v }))}
          />
          <div className="space-y-1">
            <Label htmlFor="guest-draft-nickname" className="text-xs">
              Vehicle nickname <span className="text-muted-foreground">(prints on dash card)</span>
            </Label>
            <Input
              id="guest-draft-nickname"
              placeholder='e.g. "Miss Behavin’"'
              value={draft.nickname}
              onChange={(e) =>
                setDraft((d) => ({ ...d, nickname: e.target.value }))
              }
              maxLength={48}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Your Vehicle Story</Label>
            <Input
              placeholder="Tell us about your vehicle"
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            disabled={!draftIsValid()}
            onClick={addDraftToRegistration}
          >
            <Plus className="size-4" />
            Add to Registration
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Registered Vehicles
            {registeredVehicles.length > 0 && (
              <Badge variant="default" className="ml-2">
                {registeredVehicles.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {registeredVehicles.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                    <th className="w-[5.5rem] px-3 py-2">Photo</th>
                    <th className="px-3 py-2">Vehicle</th>
                    <th className="px-3 py-2">Vehicle nickname</th>
                    <th className="px-3 py-2">
                      Class
                      <RequiredFieldMark />
                    </th>
                    <th className="w-10 px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {registeredVehicles.map((v) => (
                    <tr key={v.clientId} className="hover:bg-muted/30">
                      <td className="px-3 py-2.5">
                        <GuestVehiclePhoto
                          eventId={eventId}
                          photoUrl={v.photoUrl}
                          onPhotoChange={(url) =>
                            updateVehicle(v.clientId, { photoUrl: url })
                          }
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {!v.photoUrl ? (
                              <Car className="size-4 shrink-0 text-muted-foreground" />
                            ) : null}
                            <span className="font-medium">
                              {v.year} {v.make} {v.model}
                            </span>
                            {v.trim ? (
                              <span className="text-muted-foreground">{v.trim}</span>
                            ) : null}
                          </div>
                        {requiresVehicleClass ? (
                          <p className="mt-1 text-xs">
                            <span className="text-muted-foreground">Class: </span>
                            <span
                              className={cn(
                                "font-medium",
                                !v.eventCategoryId && "text-destructive",
                              )}
                            >
                              {guestVehicleClassLabel(v.eventCategoryId)}
                            </span>
                          </p>
                        ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Input
                          value={v.nickname}
                          onChange={(e) =>
                            updateVehicle(v.clientId, {
                              nickname: e.target.value,
                            })
                          }
                          placeholder='e.g. "Miss Behavin’"'
                          maxLength={48}
                          className="h-8 min-w-[8rem] text-sm"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        {requiresVehicleClass ? (
                          <VehicleClassSelect
                            value={v.eventCategoryId}
                            onChange={(categoryId) =>
                              updateVehicle(v.clientId, {
                                eventCategoryId: categoryId,
                              })
                            }
                            categories={eventCategories}
                            invalid={!v.eventCategoryId}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No classes configured
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeVehicle(v.clientId)}
                          aria-label="Remove vehicle"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed p-6 text-center">
              <Car className="mx-auto mb-2 size-6 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Add a vehicle above, then click Add to Registration.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
                        {t.priceCents === 0 ? "Free" : formatMoney(t.priceCents)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Review &amp; Submit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {registeredVehicles.length > 0 && (
            <ul className="space-y-1 text-sm">
              {registeredVehicles.map((v) => (
                <li key={v.clientId} className="flex items-center gap-2">
                  {!v.photoUrl ? (
                    <Car className="size-3.5 text-muted-foreground" />
                  ) : null}
                  <span>
                    {v.year} {v.make} {v.model}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {feeSummaryBlock()}

          {payRequired && checkoutReady && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              You will be redirected to Stripe to complete payment.
            </p>
          )}
          {payRequired && !checkoutReady && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              This event has a registration fee, but online payment is not set up
              yet. Contact the organizer.
            </p>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {payRequired ? (
              <>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="gap-2 sm:min-w-[12rem]"
                  disabled={formDisabled}
                  onClick={() => void handleGuestSubmit("create_account")}
                >
                  {submitting === "create_account" && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Create Account and Pay
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="gap-2 sm:min-w-[12rem]"
                  disabled={formDisabled}
                  onClick={() => void handleGuestSubmit("guest_pay")}
                >
                  {submitting === "guest_pay" && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Pay &amp; Register
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="gap-2 sm:min-w-[12rem]"
                  disabled={formDisabled}
                  onClick={() => void handleGuestSubmit("create_account")}
                >
                  {submitting === "create_account" && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Create Account &amp; Register
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="gap-2 sm:min-w-[12rem]"
                  disabled={formDisabled}
                  onClick={() => void handleGuestSubmit("free")}
                >
                  {submitting === "free" && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Register as Guest
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
