"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UsPhoneInput } from "@/components/inputs/us-phone-input";
import { ContextualHelpLink } from "@/components/help/contextual-help-link";
import { SmsNotificationsOptInProfileField } from "@/components/sms/sms-notifications-opt-in-profile-field";
import {
  AddressConfirmSheet,
  type AddressConfirmModal,
} from "@/components/profile/address-confirm-sheet";
import type { MailingFields } from "@/lib/standardize-mailing-address";

export type ProfileInitial = {
  firstName: string;
  lastName: string;
  birthYear: number | null;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  smsNotificationsOptIn: boolean;
};

export type AccountSectionFormHandle = {
  save: () => Promise<boolean>;
  cancel: () => void;
};

type Props = {
  email: string;
  pendingEmail?: string | null;
  username: string | null;
  initial: ProfileInitial;
  onDirtyChange?: (dirty: boolean) => void;
  onSaveSuccess?: () => void;
};

function valuesMatchInitial(
  initial: ProfileInitial,
  values: {
    firstName: string;
    lastName: string;
    birthYear: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    smsNotificationsOptIn: boolean;
  },
) {
  const birthYearInitial =
    initial.birthYear != null ? String(initial.birthYear) : "";
  return (
    values.firstName === initial.firstName &&
    values.lastName === initial.lastName &&
    values.birthYear === birthYearInitial &&
    values.phone === initial.phone &&
    values.street === initial.street &&
    values.city === initial.city &&
    values.state === initial.state &&
    values.zip === initial.zip &&
    values.smsNotificationsOptIn === initial.smsNotificationsOptIn
  );
}

export const AccountSectionForm = forwardRef<AccountSectionFormHandle, Props>(
  function AccountSectionForm(
    { email, pendingEmail, username, initial, onDirtyChange, onSaveSuccess },
    ref,
  ) {
    const searchParams = useSearchParams();
    const [firstName, setFirstName] = useState(initial.firstName);
    const [lastName, setLastName] = useState(initial.lastName);
    const [birthYear, setBirthYear] = useState(
      initial.birthYear != null ? String(initial.birthYear) : "",
    );
    const [phone, setPhone] = useState(initial.phone);
    const [street, setStreet] = useState(initial.street);
    const [city, setCity] = useState(initial.city);
    const [state, setState] = useState(initial.state);
    const [zip, setZip] = useState(initial.zip);
    const [smsNotificationsOptIn, setSmsNotificationsOptIn] = useState(
      initial.smsNotificationsOptIn,
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [addressModal, setAddressModal] = useState<AddressConfirmModal>(null);

    const [editingEmail, setEditingEmail] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [emailSent, setEmailSent] = useState(false);
    const emailJustUpdated = searchParams.get("email_updated") === "1";

    const resetFields = useCallback(() => {
      setFirstName(initial.firstName);
      setLastName(initial.lastName);
      setBirthYear(initial.birthYear != null ? String(initial.birthYear) : "");
      setPhone(initial.phone);
      setStreet(initial.street);
      setCity(initial.city);
      setState(initial.state);
      setZip(initial.zip);
      setSmsNotificationsOptIn(initial.smsNotificationsOptIn);
      setError(null);
    }, [initial]);

    useEffect(() => {
      resetFields();
    }, [resetFields]);

    useEffect(() => {
      onDirtyChange?.(
        !valuesMatchInitial(initial, {
          firstName,
          lastName,
          birthYear,
          phone,
          street,
          city,
          state,
          zip,
          smsNotificationsOptIn,
        }),
      );
    }, [
      birthYear,
      city,
      firstName,
      initial,
      lastName,
      onDirtyChange,
      phone,
      smsNotificationsOptIn,
      state,
      street,
      zip,
    ]);

    async function handleEmailChange(e: React.FormEvent) {
      e.preventDefault();
      setEmailError(null);
      setEmailSent(false);

      const trimmed = newEmail.trim();
      if (!trimmed) {
        setEmailError("Please enter your new email address.");
        return;
      }
      if (trimmed.toLowerCase() === email.toLowerCase()) {
        setEmailError("That is already your current email address.");
        return;
      }

      setEmailLoading(true);
      try {
        const res = await fetch("/api/me/change-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ email: trimmed }),
        });
        const data = (await res.json().catch(() => null)) as Record<
          string,
          unknown
        > | null;
        if (!res.ok) {
          setEmailError(
            typeof data?.error === "string"
              ? data.error
              : "Could not change email. Please try again.",
          );
          return;
        }
        setEmailSent(true);
      } catch {
        setEmailError("Network error. Please try again.");
      } finally {
        setEmailLoading(false);
      }
    }

    function birthYearPayload(): number | undefined {
      const t = birthYear.trim();
      if (t === "") return undefined;
      const y = Number.parseInt(t.replace(/\D/g, "").slice(0, 4), 10);
      return Number.isFinite(y) ? y : undefined;
    }

    function buildPatchBody(addr: {
      street: string;
      city: string;
      state: string;
      zip: string;
    }) {
      return {
        firstName,
        lastName,
        birthYear: birthYearPayload(),
        phone: phone.trim() ? phone : undefined,
        street: addr.street,
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
        smsNotificationsOptIn,
      };
    }

    function readSaveError(raw: unknown, status: number): string {
      if (typeof raw === "object" && raw !== null) {
        const o = raw as Record<string, unknown>;
        if (typeof o.error === "string" && o.error.trim()) return o.error;
        if (typeof o.message === "string" && o.message.trim()) return o.message;
      }
      if (status === 401) return "You must be signed in.";
      return `Could not save profile (${status}).`;
    }

    async function saveProfile(addr: {
      street: string;
      city: string;
      state: string;
      zip: string;
    }) {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(buildPatchBody(addr)),
      });
      const raw: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(readSaveError(raw ?? {}, res.status));
        return false;
      }
      setStreet(addr.street);
      setCity(addr.city);
      setState(addr.state);
      setZip(addr.zip);
      return true;
    }

    async function submitSave(): Promise<boolean> {
      if (
        valuesMatchInitial(initial, {
          firstName,
          lastName,
          birthYear,
          phone,
          street,
          city,
          state,
          zip,
          smsNotificationsOptIn,
        })
      ) {
        return true;
      }

      setError(null);

      if (smsNotificationsOptIn && !phone.trim()) {
        setError("Enter a phone number to receive SMS notifications.");
        return false;
      }

      const addr: MailingFields = {
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
      };

      if (!addr.street) {
        setLoading(true);
        try {
          return await saveProfile({
            street: "",
            city: addr.city,
            state: addr.state,
            zip: addr.zip,
          });
        } finally {
          setLoading(false);
        }
      }

      setLoading(true);
      try {
        const verifyRes = await fetch("/api/me/verify-address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            street: addr.street,
            city: addr.city,
            state: addr.state,
            zip: addr.zip,
          }),
        });
        const v = (await verifyRes.json()) as {
          status?: string;
          suggested?: MailingFields;
          input?: MailingFields;
          formattedAddress?: string;
        };

        if (!verifyRes.ok) {
          setError(
            "Could not verify address. Try again or save without verifying.",
          );
          return false;
        }

        if (v.status === "suggestion" && v.suggested && v.input) {
          setAddressModal({
            kind: "suggestion",
            input: v.input,
            suggested: v.suggested,
            formattedAddress: v.formattedAddress ?? "",
          });
          return false;
        }

        if (v.status === "not_found") {
          setAddressModal({ kind: "not_found" });
          return false;
        }

        return await saveProfile({
          street,
          city,
          state,
          zip,
        });
      } finally {
        setLoading(false);
      }
    }

    async function confirmSuggestedAddress(suggested: MailingFields) {
      setLoading(true);
      setAddressModal(null);
      try {
        const ok = await saveProfile({
          street: suggested.street,
          city: suggested.city,
          state: suggested.state,
          zip: suggested.zip,
        });
        if (ok) onSaveSuccess?.();
      } finally {
        setLoading(false);
      }
    }

    async function confirmKeepOriginalAddress() {
      setLoading(true);
      setAddressModal(null);
      try {
        const ok = await saveProfile({ street, city, state, zip });
        if (ok) onSaveSuccess?.();
      } finally {
        setLoading(false);
      }
    }

    async function saveDespiteNotFound() {
      setLoading(true);
      setAddressModal(null);
      try {
        const ok = await saveProfile({ street, city, state, zip });
        if (ok) onSaveSuccess?.();
      } finally {
        setLoading(false);
      }
    }

    useImperativeHandle(ref, () => ({
      save: submitSave,
      cancel: resetFields,
    }));

    return (
      <div className="space-y-4">
        {username ? (
          <div className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Username</span>
            <span className="font-medium">@{username}</span>
          </div>
        ) : null}

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <div className="grid gap-2">
            <Label htmlFor="profile-first-name">First name</Label>
            <Input
              id="profile-first-name"
              name="firstName"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              maxLength={80}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-last-name">Last name</Label>
            <Input
              id="profile-last-name"
              name="lastName"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              maxLength={80}
            />
          </div>
          <div className="grid w-full max-w-[4.5rem] gap-2 sm:w-auto">
            <Label htmlFor="profile-birth-year">Birth year</Label>
            <Input
              id="profile-birth-year"
              name="birthYear"
              inputMode="numeric"
              autoComplete="bday-year"
              placeholder="YYYY"
              value={birthYear}
              onChange={(e) =>
                setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              maxLength={4}
              className="tabular-nums"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Email
            </span>

            {emailJustUpdated && !pendingEmail && (
              <p
                className="text-sm text-emerald-600 dark:text-emerald-400"
                role="status"
              >
                Your email address has been updated.
              </p>
            )}

            {pendingEmail && (
              <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                Email change to <strong>{pendingEmail}</strong> is pending.
                Check both your old and new email inboxes for confirmation
                links. Both must be clicked to complete the change.
              </p>
            )}

            {!editingEmail ? (
              <>
                <p className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
                  {email}
                </p>
                {!pendingEmail && (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto justify-start p-0 text-xs"
                    onClick={() => {
                      setEditingEmail(true);
                      setNewEmail("");
                      setEmailError(null);
                      setEmailSent(false);
                    }}
                  >
                    Change email address
                  </Button>
                )}
              </>
            ) : emailSent ? (
              <div className="space-y-2">
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  Confirmation link sent to <strong>{newEmail.trim()}</strong>.
                  Check your inbox and click the link to finalize the change.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingEmail(false);
                    setEmailSent(false);
                  }}
                >
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="new@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={emailLoading}
                />
                {emailError && (
                  <p className="text-xs text-destructive">{emailError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  A confirmation link will be sent to the new address.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={emailLoading}
                    onClick={(e) =>
                      void handleEmailChange(
                        e as unknown as React.FormEvent,
                      )
                    }
                  >
                    {emailLoading ? "Sending…" : "Send confirmation"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={emailLoading}
                    onClick={() => {
                      setEditingEmail(false);
                      setEmailError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-phone">Phone</Label>
            <UsPhoneInput
              id="profile-phone"
              value={phone}
              onChange={setPhone}
              className="font-mono tabular-nums"
            />
            <p className="text-xs text-muted-foreground">
              Format (###) ###-#### — optional.
            </p>
            <SmsNotificationsOptInProfileField
              id="profile-sms-notifications-opt-in"
              checked={smsNotificationsOptIn}
              onCheckedChange={setSmsNotificationsOptIn}
            />
            <ContextualHelpLink slug="sms-notifications" />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="profile-street">
            Street address{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="profile-street"
            name="street"
            autoComplete="street-address"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-[minmax(0,7fr)_minmax(0,2fr)_minmax(0,3fr)]">
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="profile-city">City</Label>
            <Input
              id="profile-city"
              name="city"
              autoComplete="address-level2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="profile-state">State</Label>
            <Input
              id="profile-state"
              name="state"
              autoComplete="address-level1"
              placeholder="NJ"
              value={state}
              onChange={(e) => setState(e.target.value)}
              maxLength={50}
            />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="profile-zip">ZIP code</Label>
            <Input
              id="profile-zip"
              name="zip"
              autoComplete="postal-code"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              maxLength={20}
            />
          </div>
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <p className="text-xs italic text-muted-foreground">
          To change your password, use the password reset flow from the login
          page.
        </p>

        <AddressConfirmSheet
          modal={addressModal}
          onOpenChange={(open) => {
            if (!open) setAddressModal(null);
          }}
          loading={loading}
          onUseSuggested={(suggested) => void confirmSuggestedAddress(suggested)}
          onKeepOriginal={() => void confirmKeepOriginalAddress()}
          onSaveDespiteNotFound={() => void saveDespiteNotFound()}
        />
      </div>
    );
  },
);
