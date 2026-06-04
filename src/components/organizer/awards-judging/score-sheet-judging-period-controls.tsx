"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trophy } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ScoreSheetJudgingPeriodSnapshot } from "@/lib/judging/score-sheet-judging-period";

const STATUS_LABELS = {
  OPEN: "Judging open",
  CLOSED: "Judging ended",
  FINALIZED: "Results finalized",
} as const;

export function ScoreSheetJudgingPeriodControls({
  eventId,
  initialPeriod = null,
  initialLoadError = null,
  onPeriodChange,
  layout = "banner",
}: {
  eventId: string;
  initialPeriod?: ScoreSheetJudgingPeriodSnapshot | null;
  initialLoadError?: string | null;
  onPeriodChange?: () => void;
  /** banner = full card; inline = buttons only for the results toolbar */
  layout?: "banner" | "inline";
}) {
  const [period, setPeriod] = useState<ScoreSheetJudgingPeriodSnapshot | null>(
    initialPeriod,
  );
  const [loading, setLoading] = useState(!initialPeriod && !initialLoadError);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(initialLoadError);
  const [confirmFinalize, setConfirmFinalize] = useState(false);

  const loadPeriod = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/score-sheets/judging-period`, {
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ??
            "Could not load judging period. If this is a new install, run database migrations.",
        );
      }
      setPeriod(data.period as ScoreSheetJudgingPeriodSnapshot);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (!initialPeriod) {
      void loadPeriod();
    }
  }, [initialPeriod, loadPeriod]);

  async function runAction(action: "close" | "reopen" | "finalize") {
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/score-sheets/judging-period`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ??
            "Action failed. Ensure the latest app version and database migrations are deployed.",
        );
      }
      setPeriod(data.period as ScoreSheetJudgingPeriodSnapshot);
      setConfirmFinalize(false);
      onPeriodChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setActing(false);
    }
  }

  const canEndJudging = period?.status === "OPEN";
  const canReopenJudging = period?.status === "CLOSED";
  const canFinalize =
    period?.status === "OPEN" || period?.status === "CLOSED";

  const actionButtons =
    period && (canEndJudging || canReopenJudging || canFinalize) ? (
      <>
        {canEndJudging ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={acting || loading}
            onClick={() => void runAction("close")}
          >
            {acting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            End judging period
          </Button>
        ) : null}
        {canReopenJudging ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={acting || loading}
            onClick={() => void runAction("reopen")}
          >
            {acting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Re-open judging
          </Button>
        ) : null}
        {canFinalize ? (
          <Button
            type="button"
            size="sm"
            disabled={acting || loading}
            onClick={() => setConfirmFinalize(true)}
          >
            Finalize results
          </Button>
        ) : null}
      </>
    ) : null;

  const finalizeDialog = confirmFinalize && period ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => !acting && setConfirmFinalize(false)}
        aria-hidden
      />
      <div
        className="relative mx-4 w-full max-w-md rounded-xl border bg-background p-6 shadow-lg"
        role="alertdialog"
        aria-labelledby="finalize-judging-title"
      >
        <h3 id="finalize-judging-title" className="text-lg font-semibold">
          Finalize judging results?
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Ends judging for all score sheet classes and locks official rankings.
          Submitted scorecards are marked finalized.{" "}
          {period.draftSheetCount > 0
            ? `${period.draftSheetCount} draft scorecard${period.draftSheetCount === 1 ? "" : "s"} will not count. `
            : ""}
          Judges cannot edit after this. This cannot be undone.
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
            onClick={() => void runAction("finalize")}
          >
            {acting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Finalize results
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  if (layout === "inline") {
    return (
      <>
        <div className="flex flex-wrap items-center gap-2">
          {loading ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Judging…
            </span>
          ) : period ? (
            <Badge variant={period.status === "FINALIZED" ? "default" : "secondary"}>
              {STATUS_LABELS[period.status]}
            </Badge>
          ) : null}
          {actionButtons}
          {error && !period ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => void loadPeriod()}>
              Retry
            </Button>
          ) : null}
        </div>
        {error ? (
          <p className="w-full text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {finalizeDialog}
      </>
    );
  }

  return (
    <>
      <div className="space-y-3 rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold">End judging &amp; declare winners</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Head Judge, Organizer, or Site Admin can end the judging period and
              finalize official results — even if not every judge has submitted.
            </p>
          </div>
          {loading ? (
            <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" />
          ) : period ? (
            <Badge
              variant={period.status === "FINALIZED" ? "default" : "secondary"}
              className="shrink-0 text-sm"
            >
              {STATUS_LABELS[period.status]}
            </Badge>
          ) : null}
        </div>

        {period ? (
          <>
            <p className="text-xs text-muted-foreground">
              Event totals: {period.draftSheetCount} draft ·{" "}
              {period.submittedSheetCount} submitted · {period.finalizedSheetCount}{" "}
              finalized scorecards
              {period.status === "FINALIZED" && period.finalizedAt
                ? ` · Locked ${new Date(period.finalizedAt).toLocaleString()}`
                : ""}
            </p>
            {period.status === "FINALIZED" ? (
              <div className="space-y-3">
                <p className="text-sm text-emerald-800 dark:text-emerald-200">
                  Results are final. Assign trophy winners and alternates for each award.
                </p>
                <Link
                  href={`/organizer/events/${eventId}/awards-judging/trophy-winners`}
                  className={cn(
                    buttonVariants(),
                    "inline-flex w-full justify-center sm:w-auto",
                  )}
                >
                  <Trophy className="mr-2 size-4" aria-hidden />
                  Awards / Trophy Winners
                </Link>
              </div>
            ) : period.status === "CLOSED" ? (
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Judging has ended. Use <strong>Re-open judging</strong> if a judge still
                needs to submit saved work, or <strong>Finalize results</strong> to lock
                rankings and declare winners.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Use <strong>End judging</strong> to stop scorecard edits, then{" "}
                <strong>Finalize results</strong> when ready to declare winners.
              </p>
            )}
            <div className="flex flex-wrap gap-2">{actionButtons}</div>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-destructive" role="alert">
              {error ??
                "Judging period controls could not be loaded. Deploy the latest app and run database migrations."}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadPeriod()}>
              Retry
            </Button>
          </div>
        )}

        {error && period ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      {finalizeDialog}
    </>
  );
}
