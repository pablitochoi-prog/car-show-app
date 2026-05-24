"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EventSectionEditToolbar } from "@/components/forms/event-section-edit-toolbar";

type CharityData = {
  charityName: string | null;
  charityDescription: string | null;
  charityWebsite: string | null;
  charityEmail: string | null;
  charityPhone: string | null;
  charityLogoUrl: string | null;
};

type FormState = {
  charityName: string;
  charityDescription: string;
  charityWebsite: string;
  charityEmail: string;
  charityPhone: string;
  charityLogoUrl: string | null;
  logoFileName: string;
};

function toFormState(data: CharityData): FormState {
  return {
    charityName: data.charityName ?? "",
    charityDescription: data.charityDescription ?? "",
    charityWebsite: data.charityWebsite ?? "",
    charityEmail: data.charityEmail ?? "",
    charityPhone: data.charityPhone ?? "",
    charityLogoUrl: data.charityLogoUrl,
    logoFileName: data.charityLogoUrl
      ? (data.charityLogoUrl.split("/").pop() ?? "Logo uploaded")
      : "",
  };
}

function hasCharityInfo(data: CharityData): boolean {
  return Boolean(
    data.charityName?.trim() ||
      data.charityDescription?.trim() ||
      data.charityWebsite?.trim() ||
      data.charityEmail?.trim() ||
      data.charityPhone?.trim() ||
      data.charityLogoUrl?.trim(),
  );
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

export function EventCharitySection({
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

  const loadCharity = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/charity`, {
      credentials: "same-origin",
    });
    const data = (await res.json()) as CharityData & { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not load charitable organization details.");
      return;
    }
    const next = toFormState(data);
    setSaved(next);
    if (!editingRef.current) setDraft(next);
    onConfiguredChange?.(hasCharityInfo(data));
  }, [eventId, onConfiguredChange]);

  useEffect(() => {
    void loadCharity();
  }, [loadCharity]);

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
      fd.append("charityLogo", file);
      const res = await fetch(`/api/events/${eventId}/upload`, {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        error?: string;
        charityLogoUrl?: string;
      };
      if (!res.ok) {
        setLogoError(data.error ?? "Upload failed.");
        return;
      }
      if (data.charityLogoUrl) {
        patchDraft({
          charityLogoUrl: data.charityLogoUrl,
          logoFileName: file.name,
        });
        if (!editing) {
          setSaved((prev) =>
            prev
              ? {
                  ...prev,
                  charityLogoUrl: data.charityLogoUrl!,
                  logoFileName: file.name,
                }
              : prev,
          );
        }
        void loadCharity();
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
      const res = await fetch(`/api/events/${eventId}/charity`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          charityName: draft.charityName,
          charityDescription: draft.charityDescription,
          charityWebsite: draft.charityWebsite,
          charityEmail: draft.charityEmail,
          charityPhone: draft.charityPhone,
          charityLogoUrl: draft.charityLogoUrl ?? "",
        }),
      });
      const data = (await res.json()) as CharityData & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save charitable organization details.");
        return;
      }
      const next = toFormState(data);
      setSaved(next);
      setDraft(next);
      setEditing(false);
      onConfiguredChange?.(hasCharityInfo(data));
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
    (form?.charityLogoUrl
      ? (form.charityLogoUrl.split("/").pop() ?? "Logo uploaded")
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
          <ViewField label="Charity name" value={view.charityName} />
          <ViewField label="Phone" value={view.charityPhone} />
          <ViewField
            label="Email"
            value={view.charityEmail}
            href={
              view.charityEmail.trim()
                ? `mailto:${view.charityEmail.trim()}`
                : undefined
            }
          />
          <ViewField
            label="Website"
            value={view.charityWebsite}
            href={view.charityWebsite.trim() || undefined}
          />
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Description</dt>
            <dd className="font-medium whitespace-pre-wrap">
              {view.charityDescription.trim() || "—"}
            </dd>
          </div>
          {view.charityLogoUrl ? (
            <div className="sm:col-span-2">
              <dt className="mb-1 text-muted-foreground">Logo</dt>
              <dd>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={view.charityLogoUrl}
                  alt="Charity logo"
                  className="max-h-24 max-w-full rounded border object-contain"
                />
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {editing && form ? (
        <div className="space-y-4">
          <div className="space-y-2 sm:max-w-md">
            <Label htmlFor="charity-name">Charity name</Label>
            <Input
              id="charity-name"
              value={form.charityName}
              onChange={(e) => patchDraft({ charityName: e.target.value })}
              placeholder="e.g. Local Food Bank"
              disabled={busy}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="charity-description">Description</Label>
            <Textarea
              id="charity-description"
              value={form.charityDescription}
              onChange={(e) =>
                patchDraft({ charityDescription: e.target.value })
              }
              placeholder="How this charity benefits from the show…"
              rows={4}
              disabled={busy}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="charity-website">Website</Label>
              <Input
                id="charity-website"
                type="url"
                value={form.charityWebsite}
                onChange={(e) => patchDraft({ charityWebsite: e.target.value })}
                placeholder="example.org"
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="charity-email">Email</Label>
              <Input
                id="charity-email"
                type="email"
                value={form.charityEmail}
                onChange={(e) => patchDraft({ charityEmail: e.target.value })}
                placeholder="info@charity.org"
                disabled={busy}
              />
            </div>
            <div className="space-y-2 sm:col-span-2 sm:max-w-xs">
              <Label htmlFor="charity-phone">Phone</Label>
              <Input
                id="charity-phone"
                type="tel"
                value={form.charityPhone}
                onChange={(e) => patchDraft({ charityPhone: e.target.value })}
                placeholder="(555) 555-0100"
                disabled={busy}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Charity logo</Label>
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
              {form.charityLogoUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-muted-foreground"
                  disabled={busy}
                  onClick={() =>
                    patchDraft({ charityLogoUrl: null, logoFileName: "" })
                  }
                >
                  Remove
                </Button>
              ) : null}
            </div>
            {form.charityLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.charityLogoUrl}
                alt="Charity logo preview"
                className="mt-2 max-h-24 max-w-full rounded border object-contain"
              />
            ) : null}
            {logoError ? (
              <p className="text-sm text-destructive" role="alert">
                {logoError}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, WebP, or GIF (max 8 MB). Stored publicly for the event
              page.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            https:// is added to website URLs when missing.
          </p>
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
