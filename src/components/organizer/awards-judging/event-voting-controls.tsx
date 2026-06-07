"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { readResponseJson } from "@/lib/read-response-json";
import type { EventVotingControlSnapshot } from "@/lib/judging/event-voting-control-types";

const OVERALL_LABELS = {
  OPEN: "Voting open",
  CLOSED: "Voting closed",
  FINALIZED: "Results finalized",
} as const;

function hasVotingMethods(snapshot: EventVotingControlSnapshot): boolean {
  return (
    snapshot.publicVoting.configured ||
    snapshot.ballot.configured ||
    snapshot.scoreSheet.configured
  );
}

export function EventVotingControls({
  eventId,
  initialSnapshot = null,
  onVotingChange,
  onSnapshotChange,
  isSiteAdmin = false,
}: {
  eventId: string;
  initialSnapshot?: EventVotingControlSnapshot | null;
  onVotingChange?: () => void;
  onSnapshotChange?: (snapshot: EventVotingControlSnapshot) => void;
  isSiteAdmin?: boolean;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<EventVotingControlSnapshot | null>(
    initialSnapshot,
  );
  const [loading, setLoading] = useState(!initialSnapshot);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [confirmUnfinalize, setConfirmUnfinalize] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/voting-control`, {
        credentials: "same-origin",
      });
      const parsed = await readResponseJson<{
        snapshot?: EventVotingControlSnapshot;
        error?: string;
      }>(res);
      if (!parsed.bodyIsJson) {
        throw new Error(
          parsed.rawPreview
            ? `Unexpected server response (${parsed.status}). Deploy the latest app.`
            : "Could not load voting status. Deploy the latest app and run database migrations.",
        );
      }
      if (!res.ok) {
        throw new Error(parsed.data?.error ?? "Could not load voting status.");
      }
      setSnapshot(parsed.data?.snapshot ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (!initialSnapshot) {
      void load();
    }
  }, [initialSnapshot, load]);

  useEffect(() => {
    if (initialSnapshot) {
      setSnapshot(initialSnapshot);
    }
  }, [initialSnapshot]);

  async function runAction(
    action:
      | "close_all"
      | "open_all"
      | "reopen_all"
      | "finalize_all"
      | "unfinalize_all",
  ) {
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/voting-control`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action }),
      });
      const parsed = await readResponseJson<{
        snapshot?: EventVotingControlSnapshot;
        error?: string;
      }>(res);
      if (!parsed.bodyIsJson) {
        throw new Error(
          parsed.rawPreview
            ? `Unexpected server response (${parsed.status}).`
            : "Action failed. The server returned an unexpected response.",
        );
      }
      if (!res.ok) {
        throw new Error(parsed.data?.error ?? "Action failed.");
      }
      const next = parsed.data?.snapshot ?? null;
      setSnapshot(next);
      if (next) onSnapshotChange?.(next);
      setConfirmFinalize(false);
      setConfirmUnfinalize(false);
      onVotingChange?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading event voting status…
      </div>
    );
  }

  if (!snapshot) return null;

  if (!hasVotingMethods(snapshot)) {
    return (
      <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Event voting</p>
        <p className="mt-1">
          Configure Public Voting, Judge Ballot, or Score Sheet Judging below to
          use close and finalize controls.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold">Event voting control</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Open, close, or finalize all voting methods at once — Public Voting,
              Judge Ballot, and Score Sheet Judging.
            </p>
          </div>
          <Badge
            variant={snapshot.overall === "FINALIZED" ? "default" : "secondary"}
          >
            {OVERALL_LABELS[snapshot.overall]}
          </Badge>
        </div>

        <ul className="text-xs text-muted-foreground space-y-1">
          {snapshot.publicVoting.configured ? (
            <li>
              Public Voting:{" "}
              {snapshot.publicVoting.status === "open"
                ? "open"
                : snapshot.publicVoting.status === "not_started"
                  ? "not started yet"
                  : "closed"}
            </li>
          ) : null}
          {snapshot.ballot.configured ? (
            <li>
              Judge Ballot: {snapshot.ballot.openCount} open ·{" "}
              {snapshot.ballot.closedCount} closed ·{" "}
              {snapshot.ballot.finalizedCount} finalized
            </li>
          ) : null}
          {snapshot.scoreSheet.configured ? (
            <li>
              Score Sheet Judging: {snapshot.scoreSheet.status.replace(/_/g, " ")}
            </li>
          ) : null}
        </ul>

        {snapshot.overall === "CLOSED" ? (
          <p className="text-sm text-amber-900 dark:text-amber-100">
            Voting is closed for this event. If you closed by accident, use{" "}
            <strong>Reopen voting for event</strong>. When you are ready to declare
            winners, use <strong>Finalize results</strong> to lock rankings and open
            Awards / Trophy Winners.
          </p>
        ) : null}

        {snapshot.overall === "FINALIZED" ? (
          <p className="text-sm text-emerald-800 dark:text-emerald-200">
            Results are locked. The organizer can review trophy winners below.
            {isSiteAdmin
              ? " Use Un-finalize results to return to voting closed so they can reopen voting if needed."
              : " Contact site admin to reopen voting if this was a mistake."}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {snapshot.canOpenAll ? (
            <Button
              type="button"
              size="sm"
              disabled={acting}
              onClick={() => void runAction("open_all")}
            >
              {acting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Open all voting for event
            </Button>
          ) : null}
          {snapshot.canCloseAll ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={acting}
              onClick={() => void runAction("close_all")}
            >
              {acting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Close all voting for event
            </Button>
          ) : null}
          {snapshot.canReopenAll ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={acting}
              onClick={() => void runAction("reopen_all")}
            >
              {acting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Reopen voting for event
            </Button>
          ) : null}
          {snapshot.canFinalizeAll ? (
            <Button
              type="button"
              size="sm"
              disabled={acting}
              onClick={() => setConfirmFinalize(true)}
            >
              Finalize results
            </Button>
          ) : null}
          {isSiteAdmin && snapshot.canUnfinalizeAll ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={acting}
              onClick={() => setConfirmUnfinalize(true)}
            >
              Un-finalize results
            </Button>
          ) : null}
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {confirmFinalize ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => !acting && setConfirmFinalize(false)}
            aria-hidden
          />
          <div
            className="relative mx-4 w-full max-w-md rounded-xl border bg-background p-6 shadow-lg"
            role="alertdialog"
          >
            <h3 className="text-lg font-semibold">Finalize all event results?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Closes any remaining open voting, finalizes judge ballot categories,
              and locks score sheet rankings. Enables Awards / Trophy Winners.
              Organizers cannot undo this; a site administrator can un-finalize if
              needed.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={acting}
                onClick={() => setConfirmFinalize(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={acting}
                onClick={() => void runAction("finalize_all")}
              >
                {acting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Finalize results
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmUnfinalize ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => !acting && setConfirmUnfinalize(false)}
            aria-hidden
          />
          <div
            className="relative mx-4 w-full max-w-md rounded-xl border bg-background p-6 shadow-lg"
            role="alertdialog"
          >
            <h3 className="text-lg font-semibold">Un-finalize event results?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Returns this event to <strong>voting closed</strong>. The organizer
              will see <strong>Reopen voting for event</strong> and{" "}
              <strong>Finalize results</strong> again. Trophy winner assignments stay
              saved but are hidden until results are finalized again. Public voting
              stays closed until the organizer reopens it.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={acting}
                onClick={() => setConfirmUnfinalize(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={acting}
                onClick={() => void runAction("unfinalize_all")}
              >
                {acting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Un-finalize results
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
