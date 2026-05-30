"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Car,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import { VehiclePhotoDisplay } from "@/components/vehicle/vehicle-photo-display";
import { formatRegistrationMailingAddress } from "@/lib/registration-address";
import type { RegistrationDisplayStatus } from "@/lib/registration-payment-display";
import { RegistrationAddressFields } from "@/components/registration/registration-address-fields";
import { UsPhoneInput } from "@/components/inputs/us-phone-input";
import { VehicleClassSelect } from "@/components/registration/vehicle-class-select";
import { digitsFromPhoneInput, formatUSPhoneDigits } from "@/lib/phone-us";

export type OrganizerGuestVehicleRow = {
  publicVehicleId: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  nickname: string | null;
  notes: string | null;
  className: string | null;
  eventCategoryId: string | null;
  photoUrl: string | null;
};

export type EventCategoryOption = { id: string; name: string };

export type OrganizerGuestRegistrationDetailModel = {
  registrationId: string;
  eventId: string;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  tierName: string;
  tierPriceDisplay: string;
  displayStatus: RegistrationDisplayStatus;
  registrationStatus: string;
  paymentStatus: string | null;
  regFeeDisplay: string;
  amountCollectedDisplay: string;
  amountDueDisplay: string;
  vehicleCount: number;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeConnectReady: boolean;
  canEdit: boolean;
  eventCategories: EventCategoryOption[];
  vehicles: OrganizerGuestVehicleRow[];
};

function statusBadgeClass(variant: RegistrationDisplayStatus["variant"]) {
  switch (variant) {
    case "success":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200";
    case "warning":
      return "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100";
    case "danger":
      return "border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 text-sm", mono && "font-mono text-xs")}>
        {value || "—"}
      </dd>
    </div>
  );
}

export function OrganizerGuestRegistrationDetail({
  data,
}: {
  data: OrganizerGuestRegistrationDetailModel;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"checkout" | "sync" | "save" | null>(null);
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(data.contact.firstName);
  const [lastName, setLastName] = useState(data.contact.lastName);
  const [email, setEmail] = useState(data.contact.email);
  const [phone, setPhone] = useState(
    formatUSPhoneDigits(digitsFromPhoneInput(data.contact.phone)),
  );
  const [street, setStreet] = useState(data.contact.street);
  const [city, setCity] = useState(data.contact.city);
  const [state, setState] = useState(data.contact.state);
  const [zip, setZip] = useState(data.contact.zip);
  const [vehicleDrafts, setVehicleDrafts] = useState(() =>
    data.vehicles.map((v) => ({
      publicVehicleId: v.publicVehicleId ?? "",
      nickname: v.nickname ?? "",
      eventCategoryId: v.eventCategoryId,
      notes: v.notes ?? "",
    })),
  );

  function resetEditForm() {
    setFirstName(data.contact.firstName);
    setLastName(data.contact.lastName);
    setEmail(data.contact.email);
    setPhone(formatUSPhoneDigits(digitsFromPhoneInput(data.contact.phone)));
    setStreet(data.contact.street);
    setCity(data.contact.city);
    setState(data.contact.state);
    setZip(data.contact.zip);
    setVehicleDrafts(
      data.vehicles.map((v) => ({
        publicVehicleId: v.publicVehicleId ?? "",
        nickname: v.nickname ?? "",
        eventCategoryId: v.eventCategoryId,
        notes: v.notes ?? "",
      })),
    );
    setSaveError("");
  }

  function startEditing() {
    resetEditForm();
    setEditing(true);
  }

  function cancelEditing() {
    resetEditForm();
    setEditing(false);
  }

  async function saveEdits() {
    setBusy("save");
    setSaveError("");
    setActionError("");
    try {
      const res = await fetch(
        `/api/events/${data.eventId}/registrations/${data.registrationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            phone: phone.trim() ? phone : undefined,
            street: street.trim(),
            city: city.trim(),
            state: state.trim(),
            zip: zip.trim(),
            vehicles: vehicleDrafts
              .filter((v) => v.publicVehicleId)
              .map((v) => ({
                publicVehicleId: v.publicVehicleId,
                nickname: v.nickname.trim() || undefined,
                eventCategoryId: v.eventCategoryId,
                notes: v.notes.trim() || undefined,
              })),
          }),
        },
      );
      const body = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setSaveError(body.error ?? "Could not save changes.");
        return;
      }
      setEditing(false);
      setActionMessage(body.message ?? "Guest registration updated.");
      router.refresh();
    } catch {
      setSaveError("Network error while saving.");
    } finally {
      setBusy(null);
    }
  }

  const mailingAddress = formatRegistrationMailingAddress(data.contact);
  const needsPaymentHelp =
    data.registrationStatus !== "CANCELLED" &&
    (data.displayStatus.variant === "warning" ||
      data.displayStatus.variant === "danger");

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setActionMessage(`${label} copied.`);
      setActionError("");
    } catch {
      setActionError(`Could not copy ${label.toLowerCase()}.`);
    }
  }

  async function generatePaymentLink() {
    setBusy("checkout");
    setActionError("");
    setActionMessage("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: data.registrationId }),
      });
      const body = (await res.json()) as {
        checkoutUrl?: string;
        error?: string;
      };
      if (!res.ok || !body.checkoutUrl) {
        setActionError(body.error ?? "Could not create Stripe checkout link.");
        return;
      }
      setCheckoutUrl(body.checkoutUrl);
      setActionMessage(
        "Payment link ready. Copy it and send it to the guest so they can complete checkout.",
      );
    } catch {
      setActionError("Network error while creating checkout link.");
    } finally {
      setBusy(null);
    }
  }

  async function syncPaymentFromStripe() {
    setBusy("sync");
    setActionError("");
    setActionMessage("");
    try {
      const res = await fetch(
        `/api/events/${data.eventId}/registrations/${data.registrationId}/sync-payment`,
        { method: "POST" },
      );
      const body = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setActionError(body.error ?? "Could not sync payment.");
        return;
      }
      setActionMessage(body.message ?? "Payment synced.");
      router.refresh();
    } catch {
      setActionError("Network error while syncing payment.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={cn("font-medium", statusBadgeClass(data.displayStatus.variant))}>
          {data.displayStatus.label}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Registered {formatWhen(data.createdAt)}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Contact</CardTitle>
              {data.canEdit && !editing ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={startEditing}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="guest-edit-fn" className="text-xs">
                      First name
                    </Label>
                    <Input
                      id="guest-edit-fn"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      maxLength={100}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="guest-edit-ln" className="text-xs">
                      Last name
                    </Label>
                    <Input
                      id="guest-edit-ln"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      maxLength={100}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="guest-edit-email" className="text-xs">
                      Email
                    </Label>
                    <Input
                      id="guest-edit-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="guest-edit-phone" className="text-xs">
                      Phone
                    </Label>
                    <UsPhoneInput
                      id="guest-edit-phone"
                      value={phone}
                      onChange={setPhone}
                      className="h-9"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional. Use a complete 10-digit US number or leave blank.
                    </p>
                  </div>
                </div>
                <RegistrationAddressFields
                  idPrefix="guest-edit"
                  values={{ street, city, state, zip }}
                  onChange={(patch) => {
                    if (patch.street !== undefined) setStreet(patch.street);
                    if (patch.city !== undefined) setCity(patch.city);
                    if (patch.state !== undefined) setState(patch.state);
                    if (patch.zip !== undefined) setZip(patch.zip);
                  }}
                />
                {saveError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {saveError}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5"
                    disabled={busy !== null}
                    onClick={() => void saveEdits()}
                  >
                    {busy === "save" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Save changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={busy !== null}
                    onClick={cancelEditing}
                  >
                    <X className="size-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailRow label="First name" value={data.contact.firstName} />
                <DetailRow label="Last name" value={data.contact.lastName} />
                <DetailRow label="Email" value={data.contact.email} />
                <DetailRow label="Phone" value={data.contact.phone} />
                <div className="sm:col-span-2">
                  <DetailRow label="Mailing address" value={mailingAddress} />
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Registration &amp; payment</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="Registration ID" value={data.registrationId} mono />
              <DetailRow label="Tier" value={data.tierName} />
              <DetailRow label="Tier price" value={data.tierPriceDisplay} />
              <DetailRow label="Vehicles" value={String(data.vehicleCount)} />
              <DetailRow label="Event fee" value={data.regFeeDisplay} />
              <DetailRow label="Collected" value={data.amountCollectedDisplay} />
              <DetailRow label="Amount due" value={data.amountDueDisplay} />
              <DetailRow label="Registration status" value={data.registrationStatus} />
              <DetailRow label="Payment status" value={data.paymentStatus ?? "—"} />
              <DetailRow label="Paid at" value={formatWhen(data.paidAt)} />
              <DetailRow label="Last updated" value={formatWhen(data.updatedAt)} />
              {data.stripeCheckoutSessionId ? (
                <div className="sm:col-span-2">
                  <DetailRow
                    label="Stripe checkout session"
                    value={data.stripeCheckoutSessionId}
                    mono
                  />
                </div>
              ) : null}
              {data.stripePaymentIntentId ? (
                <div className="sm:col-span-2">
                  <DetailRow
                    label="Stripe payment intent"
                    value={data.stripePaymentIntentId}
                    mono
                  />
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payment assistance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Correct guest contact details here if something was entered wrong
            (for example an invalid phone number). Then generate a new Stripe
            payment link below.
          </p>

          <div className="flex flex-wrap gap-2">
            {needsPaymentHelp && data.stripeConnectReady ? (
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={busy !== null}
                onClick={() => void generatePaymentLink()}
              >
                {busy === "checkout" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CreditCard className="size-4" />
                )}
                Get Stripe payment link
              </Button>
            ) : null}

            {needsPaymentHelp && data.stripeCheckoutSessionId ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5"
                disabled={busy !== null}
                onClick={() => void syncPaymentFromStripe()}
              >
                {busy === "sync" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Sync payment from Stripe
              </Button>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                void copyText(data.contact.email, "Guest email")
              }
            >
              <Copy className="size-4" />
              Copy guest email
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                void copyText(data.registrationId, "Registration ID")
              }
            >
              <Copy className="size-4" />
              Copy registration ID
            </Button>
          </div>

          {checkoutUrl ? (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Stripe checkout URL
              </p>
              <p className="mt-1 break-all font-mono text-xs">{checkoutUrl}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  onClick={() => void copyText(checkoutUrl, "Payment link")}
                >
                  <Copy className="size-4" />
                  Copy payment link
                </Button>
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "gap-1.5",
                  )}
                >
                  <ExternalLink className="size-4" />
                  Open checkout
                </a>
              </div>
            </div>
          ) : null}

          {!data.stripeConnectReady && needsPaymentHelp ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Stripe is not fully connected for this event, so online payment
              links cannot be generated until the club finishes Stripe setup.
            </p>
          ) : null}

          {actionMessage ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              {actionMessage}
            </p>
          ) : null}
          {actionError ? (
            <p className="text-sm text-destructive" role="alert">
              {actionError}
            </p>
          ) : null}

          <p className="text-xs text-muted-foreground">
            To cancel or refund, return to{" "}
            <Link
              href={`/organizer/events/${data.eventId}/registrations`}
              className="font-medium text-primary hover:underline"
            >
              Registrations
            </Link>{" "}
            and use bulk actions on this row.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Vehicles ({data.vehicles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.vehicles.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                    <th className="w-[5.5rem] px-3 py-2">Photo</th>
                    <th className="px-3 py-2">Vehicle</th>
                    <th className="px-3 py-2">Nickname</th>
                    <th className="px-3 py-2">Class</th>
                    <th className="px-3 py-2">Show ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.vehicles.map((v, i) => {
                    const draft = vehicleDrafts[i];
                    return (
                    <tr key={v.publicVehicleId ?? `${v.make}-${v.model}-${i}`}>
                      <td className="px-3 py-2.5">
                        {v.photoUrl ? (
                          <VehiclePhotoDisplay
                            src={v.photoUrl}
                            alt=""
                            size="thumb"
                          />
                        ) : (
                          <div className="vehicle-photo-frame vehicle-photo-frame--thumb flex items-center justify-center rounded-md border border-dashed bg-muted/40">
                            <Car className="size-5 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium">
                          {v.year} {v.make} {v.model}
                          {v.trim ? (
                            <span className="text-muted-foreground">
                              {" "}
                              {v.trim}
                            </span>
                          ) : null}
                        </p>
                        {editing && draft ? (
                          <Textarea
                            value={draft.notes}
                            onChange={(e) =>
                              setVehicleDrafts((prev) =>
                                prev.map((row, idx) =>
                                  idx === i
                                    ? { ...row, notes: e.target.value }
                                    : row,
                                ),
                              )
                            }
                            rows={2}
                            className="mt-2 min-h-[3rem] text-xs"
                            placeholder="Vehicle story"
                          />
                        ) : v.notes ? (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {v.notes}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5">
                        {editing && draft ? (
                          <Input
                            value={draft.nickname}
                            onChange={(e) =>
                              setVehicleDrafts((prev) =>
                                prev.map((row, idx) =>
                                  idx === i
                                    ? { ...row, nickname: e.target.value }
                                    : row,
                                ),
                              )
                            }
                            maxLength={48}
                            className="h-8 min-w-[8rem] text-sm"
                          />
                        ) : (
                          v.nickname || "—"
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {editing &&
                        draft &&
                        data.eventCategories.length > 0 ? (
                          <VehicleClassSelect
                            value={draft.eventCategoryId}
                            onChange={(categoryId) =>
                              setVehicleDrafts((prev) =>
                                prev.map((row, idx) =>
                                  idx === i
                                    ? { ...row, eventCategoryId: categoryId }
                                    : row,
                                ),
                              )
                            }
                            categories={data.eventCategories}
                            invalid={!draft.eventCategoryId}
                          />
                        ) : (
                          v.className || "—"
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {v.publicVehicleId || "—"}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No vehicles were saved on this guest registration.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
