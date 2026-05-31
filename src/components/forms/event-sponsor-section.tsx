"use client";

import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EventSectionEditToolbar } from "@/components/forms/event-section-edit-toolbar";
import { useEventSponsor } from "@/hooks/use-event-setup-cache";

type SponsorData = {
  sponsorName: string | null;
  sponsorPrimaryContact: string | null;
  sponsorStreet: string | null;
  sponsorCity: string | null;
  sponsorState: string | null;
  sponsorZip: string | null;
  sponsorPhone: string | null;
  sponsorEmail: string | null;
  sponsorWebsite: string | null;
  sponsorLogoUrl: string | null;
};

type FormState = {
  sponsorName: string;
  sponsorPrimaryContact: string;
  sponsorStreet: string;
  sponsorCity: string;
  sponsorState: string;
  sponsorZip: string;
  sponsorPhone: string;
  sponsorEmail: string;
  sponsorWebsite: string;
  sponsorLogoUrl: string | null;
  logoFileName: string;
};

function toFormState(data: SponsorData): FormState {
  return {
    sponsorName: data.sponsorName ?? "",
    sponsorPrimaryContact: data.sponsorPrimaryContact ?? "",
    sponsorStreet: data.sponsorStreet ?? "",
    sponsorCity: data.sponsorCity ?? "",
    sponsorState: data.sponsorState ?? "",
    sponsorZip: data.sponsorZip ?? "",
    sponsorPhone: data.sponsorPhone ?? "",
    sponsorEmail: data.sponsorEmail ?? "",
    sponsorWebsite: data.sponsorWebsite ?? "",
    sponsorLogoUrl: data.sponsorLogoUrl,
    logoFileName: data.sponsorLogoUrl
      ? (data.sponsorLogoUrl.split("/").pop() ?? "Logo uploaded")
      : "",
  };
}

function hasSponsorInfo(data: SponsorData): boolean {
  return Boolean(
    data.sponsorName?.trim() ||
      data.sponsorPrimaryContact?.trim() ||
      data.sponsorStreet?.trim() ||
      data.sponsorCity?.trim() ||
      data.sponsorState?.trim() ||
      data.sponsorZip?.trim() ||
      data.sponsorPhone?.trim() ||
      data.sponsorEmail?.trim() ||
      data.sponsorWebsite?.trim() ||
      data.sponsorLogoUrl?.trim(),
  );
}

function formatAddress(data: FormState): string {
  const cityStateZip = [
    data.sponsorCity.trim(),
    [data.sponsorState.trim(), data.sponsorZip.trim()].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  return [data.sponsorStreet.trim(), cityStateZip || null]
    .filter(Boolean)
    .join(", ");
}

function ViewField({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium break-all">
        {value.trim() ? (
          href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              {value}
            </a>
          ) : (
            value
          )
        ) : (
          "—"
        )}
      </dd>
    </div>
  );
}

export function EventSponsorSection({
  eventId,
  onConfiguredChange,
}: {
  eventId: string;
  onConfiguredChange?: (configured: boolean) => void;
}) {
  const [saved, setSaved] = useState<FormState | null>(null);
  const [draft, setDraft] = useState<FormState | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [error, setError] = useState("");
  const [logoError, setLogoError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const editingRef = useRef(editing);
  editingRef.current = editing;

  const { data, error: fetchError, mutate: mutateSponsor } = useEventSponsor(eventId);

  useEffect(() => {
    if (!data) return;
    const sponsorData = data as SponsorData;
    const next = toFormState(sponsorData);
    setSaved(next);
    if (!editingRef.current) setDraft(next);
    onConfiguredChange?.(hasSponsorInfo(sponsorData));
  }, [data, onConfiguredChange]);

  useEffect(() => {
    if (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Could not load sponsor details.",
      );
    }
  }, [fetchError]);

  function patchDraft(partial: Partial<FormState>) {
    setDraft((prev) => (prev ? { ...prev, ...partial } : prev));
  }

  async function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setLogoError("");
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("sponsorLogo", file);
      const res = await fetch(`/api/events/${eventId}/upload`, {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        error?: string;
        sponsorLogoUrl?: string;
      };
      if (!res.ok) {
        setLogoError(data.error ?? "Upload failed.");
        return;
      }
      if (data.sponsorLogoUrl) {
        patchDraft({
          sponsorLogoUrl: data.sponsorLogoUrl,
          logoFileName: file.name,
        });
        if (!editing) {
          setSaved((prev) =>
            prev
              ? {
                  ...prev,
                  sponsorLogoUrl: data.sponsorLogoUrl!,
                  logoFileName: file.name,
                }
              : prev,
          );
        }
        void mutateSponsor();
      }
    } catch {
      setLogoError("Could not upload. Try again.");
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleDone() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/sponsor`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          sponsorName: draft.sponsorName,
          sponsorPrimaryContact: draft.sponsorPrimaryContact,
          sponsorStreet: draft.sponsorStreet,
          sponsorCity: draft.sponsorCity,
          sponsorState: draft.sponsorState,
          sponsorZip: draft.sponsorZip,
          sponsorPhone: draft.sponsorPhone,
          sponsorEmail: draft.sponsorEmail,
          sponsorWebsite: draft.sponsorWebsite,
          sponsorLogoUrl: draft.sponsorLogoUrl ?? "",
        }),
      });
      const data = (await res.json()) as SponsorData & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save sponsor details.");
        return;
      }
      await mutateSponsor(data, { revalidate: false });
      const next = toFormState(data);
      setSaved(next);
      setDraft(next);
      setEditing(false);
      onConfiguredChange?.(hasSponsorInfo(data));
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  function handleStartEdit() {
    if (saved) setDraft({ ...saved });
    setEditing(true);
    setError("");
    setLogoError("");
  }

  function handleCancelEdit() {
    if (saved) setDraft({ ...saved });
    setEditing(false);
    setError("");
    setLogoError("");
  }

  const view = saved;
  const form = draft;
  const displayFileName =
    form?.logoFileName.trim() ||
    (form?.sponsorLogoUrl
      ? (form.sponsorLogoUrl.split("/").pop() ?? "Logo uploaded")
      : "");

  return (
    <div className="space-y-4">
      <EventSectionEditToolbar
        editing={editing}
        busy={busy}
        onStartEdit={handleStartEdit}
        onDone={() => void handleDone()}
      />

      {!editing && view ? (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <ViewField label="Sponsor name" value={view.sponsorName} />
          <ViewField label="Primary contact" value={view.sponsorPrimaryContact} />
          <div className="sm:col-span-2">
            <ViewField label="Address" value={formatAddress(view)} />
          </div>
          <ViewField label="Phone" value={view.sponsorPhone} />
          <ViewField
            label="Email"
            value={view.sponsorEmail}
            href={
              view.sponsorEmail.trim()
                ? `mailto:${view.sponsorEmail.trim()}`
                : undefined
            }
          />
          <div className="sm:col-span-2">
            <ViewField
              label="Website"
              value={view.sponsorWebsite}
              href={view.sponsorWebsite.trim() || undefined}
            />
          </div>
          {view.sponsorLogoUrl ? (
            <div className="sm:col-span-2">
              <dt className="mb-1 text-muted-foreground">Logo</dt>
              <dd>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={view.sponsorLogoUrl}
                  alt="Sponsor logo"
                  className="max-h-24 max-w-full rounded border object-contain"
                />
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {editing && form ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2 sm:max-w-md">
              <Label htmlFor="sponsor-name">Sponsor name</Label>
              <Input
                id="sponsor-name"
                value={form.sponsorName}
                onChange={(e) => patchDraft({ sponsorName: e.target.value })}
                placeholder="e.g. Acme Auto Parts"
                disabled={busy}
              />
            </div>
            <div className="space-y-2 sm:col-span-2 sm:max-w-md">
              <Label htmlFor="sponsor-contact">Primary contact</Label>
              <Input
                id="sponsor-contact"
                value={form.sponsorPrimaryContact}
                onChange={(e) =>
                  patchDraft({ sponsorPrimaryContact: e.target.value })
                }
                placeholder="Jane Smith"
                disabled={busy}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sponsor-street">Address</Label>
              <Input
                id="sponsor-street"
                value={form.sponsorStreet}
                onChange={(e) => patchDraft({ sponsorStreet: e.target.value })}
                placeholder="123 Main St"
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sponsor-city">City</Label>
              <Input
                id="sponsor-city"
                value={form.sponsorCity}
                onChange={(e) => patchDraft({ sponsorCity: e.target.value })}
                disabled={busy}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="sponsor-state">State</Label>
                <Input
                  id="sponsor-state"
                  value={form.sponsorState}
                  onChange={(e) => patchDraft({ sponsorState: e.target.value })}
                  placeholder="TX"
                  maxLength={2}
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sponsor-zip">Zip</Label>
                <Input
                  id="sponsor-zip"
                  value={form.sponsorZip}
                  onChange={(e) => patchDraft({ sponsorZip: e.target.value })}
                  disabled={busy}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sponsor-phone">Phone</Label>
              <Input
                id="sponsor-phone"
                type="tel"
                value={form.sponsorPhone}
                onChange={(e) => patchDraft({ sponsorPhone: e.target.value })}
                placeholder="(555) 555-0100"
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sponsor-email">Email</Label>
              <Input
                id="sponsor-email"
                type="email"
                value={form.sponsorEmail}
                onChange={(e) => patchDraft({ sponsorEmail: e.target.value })}
                placeholder="contact@sponsor.com"
                disabled={busy}
              />
            </div>
            <div className="space-y-2 sm:col-span-2 sm:max-w-md">
              <Label htmlFor="sponsor-website">Website</Label>
              <Input
                id="sponsor-website"
                type="url"
                value={form.sponsorWebsite}
                onChange={(e) => patchDraft({ sponsorWebsite: e.target.value })}
                placeholder="example.com"
                disabled={busy}
              />
              <p className="text-xs text-muted-foreground">
                https:// is added when missing.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Sponsor logo</Label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => void onLogoChange(e)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={logoUploading || busy}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="size-4 shrink-0" aria-hidden />
                {logoUploading ? "Uploading…" : "Upload logo"}
              </Button>
              <span
                className="min-w-0 flex-1 truncate text-sm text-muted-foreground"
                title={displayFileName || undefined}
              >
                {displayFileName || "No file uploaded"}
              </span>
              {form.sponsorLogoUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-muted-foreground"
                  disabled={busy}
                  onClick={() =>
                    patchDraft({ sponsorLogoUrl: null, logoFileName: "" })
                  }
                >
                  Remove
                </Button>
              ) : null}
            </div>
            {form.sponsorLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.sponsorLogoUrl}
                alt="Sponsor logo preview"
                className="mt-2 max-h-24 max-w-full rounded border object-contain"
              />
            ) : null}
            {logoError ? (
              <p className="text-sm text-destructive" role="alert">
                {logoError}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, WebP, or GIF (max 8 MB). Stored publicly for dash cards
              and the event page.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={handleCancelEdit}
          >
            Cancel
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
