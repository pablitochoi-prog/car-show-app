"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildCarClubApiPayload } from "@/lib/car-club-api-payload";
import { CarClubEventsActivitiesCard } from "./car-club-events-activities-card";
import {
  CarClubFormFields,
  type CarClubFormValues,
} from "./new/car-club-form-fields";

async function parseApiResponse(res: Response): Promise<{
  ok: boolean;
  error: string;
}> {
  const rawText = await res.text();
  let data: { error?: string; detail?: string } = {};
  try {
    data = rawText ? (JSON.parse(rawText) as typeof data) : {};
  } catch {
    return {
      ok: false,
      error: `Request failed (${res.status}). Unexpected response.`,
    };
  }
  if (!res.ok) {
    const msg = data.error ?? "Request failed";
    return {
      ok: false,
      error: data.detail ? `${msg} — ${data.detail}` : msg,
    };
  }
  return { ok: true, error: "" };
}

export function EditCarClubForm({
  organizationId,
  initialValues,
  isArchived,
}: {
  organizationId: string;
  initialValues: CarClubFormValues;
  isArchived: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState<CarClubFormValues>(initialValues);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const patch = (p: Partial<CarClubFormValues>) =>
    setV((s) => ({ ...s, ...p }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/organizations/${organizationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCarClubApiPayload(v)),
      });
      const { ok, error: msg } = await parseApiResponse(res);
      if (!ok) {
        setError(msg);
        return;
      }
      router.push("/dashboard/clubs");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleArchivePermanently() {
    setError("");
    setArchiveLoading(true);
    try {
      const res = await fetch(`/api/organizations/${organizationId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });
      const { ok, error: msg } = await parseApiResponse(res);
      if (!ok) {
        setError(msg);
        return;
      }
      setArchiveConfirmOpen(false);
      router.push("/dashboard/clubs");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong. Try again."
      );
    } finally {
      setArchiveLoading(false);
    }
  }

  async function handleRestore() {
    setError("");
    setArchiveLoading(true);
    try {
      const res = await fetch(`/api/organizations/${organizationId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      });
      const { ok, error: msg } = await parseApiResponse(res);
      if (!ok) {
        setError(msg);
        return;
      }
      router.push("/dashboard/clubs");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong. Try again."
      );
    } finally {
      setArchiveLoading(false);
    }
  }

  async function handleDelete() {
    setError("");
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/organizations/${organizationId}`, {
        method: "DELETE",
      });
      const { ok, error: msg } = await parseApiResponse(res);
      if (!ok) {
        setError(msg);
        return;
      }
      setDeleteConfirmOpen(false);
      router.push("/dashboard/clubs");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong. Try again."
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="page-shell max-w-3xl space-y-8">
      <div className="page-head flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit car club</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your club listing. Only club owners can change these details.
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

      {isArchived ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
          This club is <strong>archived</strong> and hidden from your main list.
          Use <strong>Restore club</strong> below to show it again.
        </div>
      ) : null}

      <form
        id="edit-car-club-form"
        onSubmit={onSubmit}
        className="space-y-6"
      >
        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <CarClubFormFields
          v={v}
          patch={patch}
          organizationId={organizationId}
          showUpcomingInAbout={false}
        />
      </form>

      <CarClubEventsActivitiesCard organizationId={organizationId} />

      <div className="space-y-3 border-t border-border pt-6">
        <p className="text-xs text-muted-foreground">
          Archive hides the club from My clubs without deleting data. Delete
          permanently removes the club; hosted events stay linked without an
          organization.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              form="edit-car-club-form"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
            <Link
              href="/dashboard/clubs"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Cancel
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {isArchived ? (
              <Button
                type="button"
                variant="secondary"
                disabled={archiveLoading}
                onClick={() => void handleRestore()}
              >
                {archiveLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Restore club
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={archiveLoading}
                onClick={() => setArchiveConfirmOpen(true)}
              >
                Archive club
              </Button>
            )}
            <Button
              type="button"
              variant="destructive"
              disabled={deleteLoading}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              Delete club permanently
            </Button>
          </div>
        </div>
      </div>

      {archiveConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="archive-club-title"
        >
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-lg">
            <p id="archive-club-title" className="text-sm leading-relaxed">
              Archive this club? It will be hidden from My clubs until you
              restore it.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setArchiveConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={archiveLoading}
                onClick={() => void handleArchivePermanently()}
              >
                {archiveLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Archive
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-club-title"
        >
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-lg">
            <p id="delete-club-title" className="text-sm leading-relaxed">
              Permanently delete this club? This cannot be undone. Events that
              used this club will remain without an organization link.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteLoading}
                onClick={() => void handleDelete()}
              >
                {deleteLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete permanently
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
