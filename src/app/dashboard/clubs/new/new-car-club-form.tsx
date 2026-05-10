"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { safeInternalPath } from "@/lib/safe-internal-path";
import { buildCarClubApiPayload } from "@/lib/car-club-api-payload";
import {
  CarClubFormFields,
  type CarClubFormValues,
} from "./car-club-form-fields";

const initial: CarClubFormValues = {
  name: "",
  logo: "",
  logoFileName: "",
  description: "",
  motto: "",
  primaryMeetingLocation: "",
  meetingFrequency: "",
  meetingTime: "10:00",
  meetingVenueName: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  lat: "",
  lng: "",
  contactFirstName: "",
  contactLastName: "",
  contactEmail: "",
  contactPhone: "",
  contactRole: "",
  websiteUrl: "",
  facebookUrl: "",
  instagramUrl: "",
  youtubeUrl: "",
  tikTokUrl: "",
  openToPublic: true,
  requiresMemberAccount: false,
  yearFounded: "",
  clubState: "",
};

function NewCarClubFormFallback() {
  return (
    <div className="page-shell flex max-w-3xl items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function NewCarClubFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkEventId = searchParams.get("linkEventId")?.trim() || null;
  const returnToParam = safeInternalPath(searchParams.get("returnTo"));

  const [v, setV] = useState<CarClubFormValues>(initial);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const patch = (p: Partial<CarClubFormValues>) =>
    setV((s) => ({ ...s, ...p }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = buildCarClubApiPayload(v);

      const res = await fetch("/api/organizations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const rawText = await res.text();
      let data: { error?: string; detail?: string; id?: string } = {};
      try {
        data = rawText ? (JSON.parse(rawText) as typeof data) : {};
      } catch {
        setError(
          `Could not save (${res.status}). The server returned an unexpected response.`
        );
        return;
      }

      if (!res.ok) {
        const msg = data.error ?? "Could not create car club";
        setError(data.detail ? `${msg} — ${data.detail}` : msg);
        return;
      }

      const orgId = data.id;
      if (!orgId) {
        setError("Could not create car club (missing id).");
        return;
      }

      if (linkEventId) {
        const linkRes = await fetch(
          `/api/events/${encodeURIComponent(linkEventId)}`,
          {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orgId }),
          }
        );
        const linkRaw = await linkRes.text();
        let linkData: { error?: string; detail?: string } = {};
        try {
          linkData = linkRaw ? (JSON.parse(linkRaw) as typeof linkData) : {};
        } catch {
          setError(
            "Club was created but linking it to your event failed (unexpected response)."
          );
          return;
        }
        if (!linkRes.ok) {
          const msg =
            linkData.error ??
            "Club was created but could not be set as the hosting organization.";
          const extra =
            typeof linkData.detail === "string" && linkData.detail
              ? ` — ${linkData.detail}`
              : "";
          setError(msg + extra);
          return;
        }
      }

      setSuccessOpen(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSuccessOk() {
    setSuccessOpen(false);
    const dest =
      returnToParam ??
      (linkEventId
        ? `/organizer/events/${encodeURIComponent(linkEventId)}/edit`
        : "/dashboard/clubs");
    router.push(dest);
    router.refresh();
  }

  const cancelHref = linkEventId
    ? `/organizer/events/${encodeURIComponent(linkEventId)}/edit`
    : "/dashboard/clubs";

  return (
    <div className="page-shell max-w-3xl space-y-8">
      <div className="page-head flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New car club</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {linkEventId ? (
              <>
                Complete this form to create your club. It will be linked as the
                hosting organization for your saved event (same event ID).
              </>
            ) : (
              <>
                Tell us about your club. Only club name is required; everything
                else helps members find you.
              </>
            )}
          </p>
        </div>
        <Link
          href="/dashboard/clubs"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full justify-center sm:w-auto"
          )}
        >
          Back to My clubs
        </Link>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <CarClubFormFields v={v} patch={patch} />

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save car club
          </Button>
          <Link
            href={cancelHref}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Cancel
          </Link>
        </div>
      </form>

      {successOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="club-success-title"
        >
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-lg backdrop-blur">
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle className="size-10 text-emerald-500" aria-hidden />
              <p
                id="club-success-title"
                className="text-lg font-semibold leading-relaxed text-foreground"
              >
                {linkEventId
                  ? "Your new club is set as the hosting organization for your event."
                  : "You've successfully added a new car club."}
              </p>
            </div>
            <div className="mt-6 flex justify-center">
              <Button type="button" onClick={handleSuccessOk}>
                OK
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function NewCarClubForm() {
  return (
    <Suspense fallback={<NewCarClubFormFallback />}>
      <NewCarClubFormInner />
    </Suspense>
  );
}
