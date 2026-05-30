"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UsPhoneInput } from "@/components/inputs/us-phone-input";
import type { RegistrationContact } from "@/lib/registration-contact";
import { hasCompleteMailingAddress } from "@/lib/registration-address";
import type { UpdateProfileInput } from "@/lib/validation/profile";
import { RegistrationAddressFields } from "./registration-address-fields";

export type ProfilePatchExtras = Pick<
  UpdateProfileInput,
  "birthYear" | "street" | "city" | "state" | "zip"
>;

export function RegistrationContactSheet({
  open,
  onOpenChange,
  initialContact,
  profileExtras,
  accountEmail,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContact: RegistrationContact;
  profileExtras: ProfilePatchExtras;
  accountEmail: string;
  onApply: (contact: RegistrationContact) => void;
}) {
  const [firstName, setFirstName] = useState(initialContact.firstName);
  const [lastName, setLastName] = useState(initialContact.lastName);
  const [email, setEmail] = useState(initialContact.email);
  const [phone, setPhone] = useState(initialContact.phone);
  const [street, setStreet] = useState(initialContact.street);
  const [city, setCity] = useState(initialContact.city);
  const [state, setState] = useState(initialContact.state);
  const [zip, setZip] = useState(initialContact.zip);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<"profile" | "event" | null>(null);

  useEffect(() => {
    if (!open) return;
    setFirstName(initialContact.firstName);
    setLastName(initialContact.lastName);
    setEmail(initialContact.email);
    setPhone(initialContact.phone);
    setStreet(initialContact.street);
    setCity(initialContact.city);
    setState(initialContact.state);
    setZip(initialContact.zip);
    setError("");
    setSaving(null);
  }, [open, initialContact]);

  function buildContact(): RegistrationContact {
    return {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      street: street.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      zip: zip.trim(),
    };
  }

  function validate(): string | null {
    if (!firstName.trim()) return "First name is required.";
    if (!lastName.trim()) return "Last name is required.";
    if (!email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return "Enter a valid email address.";
    }
    if (!hasCompleteMailingAddress(buildContact())) {
      return "City, state, and zip are required.";
    }
    return null;
  }

  async function handleSaveToProfile() {
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    setSaving("profile");
    setError("");
    try {
      const contact = buildContact();
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone || undefined,
          birthYear: profileExtras.birthYear,
          street: street.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          zip: zip.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not update your profile.");
        return;
      }
      onApply(contact);
      onOpenChange(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  function handleJustForEvent() {
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    setSaving("event");
    onApply(buildContact());
    onOpenChange(false);
    setSaving(null);
  }

  if (!open) return null;

  const busy = saving !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reg-contact-dialog-title"
      onClick={() => {
        if (!busy) onOpenChange(false);
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <h2
            id="reg-contact-dialog-title"
            className="text-base font-semibold leading-tight"
          >
            Update contact information
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Details shared with the event organizer. Save to your profile or use
            different information for this show only. Login email: {accountEmail}.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="reg-contact-fn" className="text-xs">
                First name
              </Label>
              <Input
                id="reg-contact-fn"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={100}
                autoComplete="given-name"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-contact-ln" className="text-xs">
                Last name
              </Label>
              <Input
                id="reg-contact-ln"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                maxLength={100}
                autoComplete="family-name"
                className="h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="reg-contact-email" className="text-xs">
                Email address
              </Label>
              <Input
                id="reg-contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-contact-phone" className="text-xs">
                Phone number
              </Label>
              <UsPhoneInput
                id="reg-contact-phone"
                value={phone}
                onChange={setPhone}
                className="h-9"
              />
            </div>
          </div>

          <RegistrationAddressFields
            idPrefix="reg-contact"
            values={{ street, city, state, zip }}
            onChange={(patch) => {
              if (patch.street !== undefined) setStreet(patch.street);
              if (patch.city !== undefined) setCity(patch.city);
              if (patch.state !== undefined) setState(patch.state);
              if (patch.zip !== undefined) setZip(patch.zip);
            }}
          />

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={handleJustForEvent}
            >
              {saving === "event" && (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              )}
              Just for this Event
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void handleSaveToProfile()}
            >
              {saving === "profile" && (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              )}
              Save to My Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
