"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScoreSheetJudgingPeriodControls } from "@/components/organizer/awards-judging/score-sheet-judging-period-controls";
import type { ScoreSheetJudgingPeriodSnapshot } from "@/lib/judging/score-sheet-judging-period";
import type {
  ScoreSheetClassResults,
  ScoreSheetResultRow,
} from "@/lib/judging/score-sheet-results";

type JudgingClassOption = {
  id: string;
  name: string;
  templateName: string;
  isActive: boolean;
};

function vehicleDetailHref(
  eventId: string,
  judgingClassId: string,
  vehicleEntryCode: string,
): string {
  return `/organizer/events/${eventId}/awards-judging/score-sheets/results/vehicle/${encodeURIComponent(vehicleEntryCode)}?judgingClassId=${encodeURIComponent(judgingClassId)}`;
}

function ResultsTable({
  eventId,
  judgingClassId,
  rows,
  emptyMessage,
}: {
  eventId: string;
  judgingClassId: string;
  rows: ScoreSheetResultRow[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Rank</th>
            <th className="py-2 pr-3 font-medium">Entry</th>
            <th className="py-2 pr-3 font-medium">Vehicle</th>
            <th className="py-2 pr-3 font-medium">Class</th>
            <th className="py-2 pr-3 font-medium">Owner</th>
            <th className="py-2 pr-3 font-medium">Avg score</th>
            <th className="py-2 pr-3 font-medium">Judges</th>
            <th className="py-2 pr-3 font-medium">High</th>
            <th className="py-2 pr-3 font-medium">Low</th>
            <th className="py-2 pr-3 font-medium">Spread</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <ResultRow
              key={row.vehicleEntryCode}
              eventId={eventId}
              judgingClassId={judgingClassId}
              row={row}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultRow({
  eventId,
  judgingClassId,
  row,
}: {
  eventId: string;
  judgingClassId: string;
  row: ScoreSheetResultRow;
}) {
  const statusParts = [
    row.draftCount > 0 ? `${row.draftCount} draft` : null,
    row.submittedCount > 0 ? `${row.submittedCount} submitted` : null,
    row.finalizedCount > 0 ? `${row.finalizedCount} finalized` : null,
  ].filter(Boolean);

  return (
    <>
      <tr className="border-b last:border-0">
        <td className="py-2 pr-3 align-top">
          {row.rank ?? "—"}
          {row.isTied && row.rank != null ? (
            <span className="ml-1 text-xs text-amber-600">(tie)</span>
          ) : null}
        </td>
        <td className="py-2 pr-3 align-top font-mono">{row.vehicleEntryCode}</td>
        <td className="py-2 pr-3 align-top">
          {row.vehicleNickname ? (
            <span className="font-medium">{row.vehicleNickname}</span>
          ) : null}
          <span
            className={
              row.vehicleNickname ? "block text-xs text-muted-foreground" : ""
            }
          >
            {row.year} {row.make} {row.model}
          </span>
        </td>
        <td className="py-2 pr-3 align-top">{row.vehicleClass}</td>
        <td className="py-2 pr-3 align-top">{row.ownerName ?? "—"}</td>
        <td className="py-2 pr-3 align-top font-medium">
          {row.officialScore != null ? (
            <>
              {row.officialScore}
              {row.rank == null &&
              row.draftCount > 0 &&
              row.submittedCount === 0 ? (
                <span className="ml-1 text-xs font-normal text-amber-700 dark:text-amber-400">
                  (interim)
                </span>
              ) : null}
            </>
          ) : (
            "—"
          )}
        </td>
        <td className="py-2 pr-3 align-top">{row.judgeCount || "—"}</td>
        <td className="py-2 pr-3 align-top">
          {row.highScore != null ? row.highScore : "—"}
        </td>
        <td className="py-2 pr-3 align-top">
          {row.lowScore != null ? row.lowScore : "—"}
        </td>
        <td className="py-2 pr-3 align-top">
          {row.scoreSpread != null ? row.scoreSpread : "—"}
        </td>
        <td className="py-2 pr-3 align-top text-xs text-muted-foreground">
          {statusParts.length > 0 ? statusParts.join(" · ") : "—"}
        </td>
        <td className="py-2 align-top">
          <Link
            href={vehicleDetailHref(eventId, judgingClassId, row.vehicleEntryCode)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            View score sheets
          </Link>
        </td>
      </tr>
      {row.sectionAverages.length > 0 ? (
        <tr className="border-b bg-muted/20 last:border-0">
          <td colSpan={12} className="px-3 py-2">
            <details>
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                Section averages ({row.sectionAverages.length})
              </summary>
              <ul className="mt-2 flex flex-wrap gap-2">
                {row.sectionAverages.map((section) => (
                  <li key={`${section.sortOrder}-${section.sectionName}`}>
                    <Badge variant="outline" className="font-normal">
                      {section.sectionName}: {section.averageScore}
                    </Badge>
                  </li>
                ))}
              </ul>
            </details>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function ScoreSheetResultsAdmin({
  eventId,
  initialJudgingPeriod = null,
  initialJudgingPeriodError = null,
}: {
  eventId: string;
  initialJudgingPeriod?: ScoreSheetJudgingPeriodSnapshot | null;
  initialJudgingPeriodError?: string | null;
}) {
  const [classes, setClasses] = useState<JudgingClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [results, setResults] = useState<ScoreSheetClassResults | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    setLoadingClasses(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/judging-classes`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load judging classes.");
      const list = (data.classes ?? []) as Array<{
        id: string;
        name: string;
        templateName: string;
        isActive: boolean;
      }>;
      const active = list.filter((c) => c.isActive);
      setClasses(active);
      setSelectedClassId((prev) => {
        if (prev && active.some((c) => c.id === prev)) return prev;
        return active[0]?.id ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load classes.");
      setClasses([]);
      setSelectedClassId(null);
    } finally {
      setLoadingClasses(false);
    }
  }, [eventId]);

  const loadResults = useCallback(async (classId: string) => {
    setLoadingResults(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/events/${eventId}/score-sheets/results?judgingClassId=${encodeURIComponent(classId)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load results.");
      setResults(data as ScoreSheetClassResults);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load results.");
      setResults(null);
    } finally {
      setLoadingResults(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (!selectedClassId) {
      setResults(null);
      return;
    }
    void loadResults(selectedClassId);
  }, [selectedClassId, loadResults]);

  const exportHref =
    selectedClassId != null
      ? `/api/events/${eventId}/score-sheets/results/export?judgingClassId=${encodeURIComponent(selectedClassId)}`
      : null;

  if (loadingClasses) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="space-y-4">
        <ScoreSheetJudgingPeriodControls
          eventId={eventId}
          initialPeriod={initialJudgingPeriod}
          initialLoadError={initialJudgingPeriodError}
        />
        <p className="text-sm text-muted-foreground">
          No active judging classes. Configure classes on the{" "}
          <Link
            href={`/organizer/events/${eventId}/awards-judging/score-sheets`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Score Sheet setup
          </Link>{" "}
          page first.
        </p>
      </div>
    );
  }

  const refreshResults = () => {
    if (selectedClassId) void loadResults(selectedClassId);
  };

  return (
    <div className="space-y-6">
      <ScoreSheetJudgingPeriodControls
        eventId={eventId}
        initialPeriod={initialJudgingPeriod}
        initialLoadError={initialJudgingPeriodError}
        onPeriodChange={refreshResults}
        layout="banner"
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="judging-class" className="text-sm font-medium">
            Judging class
          </label>
          <select
            id="judging-class"
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedClassId ?? ""}
            onChange={(e) => setSelectedClassId(e.target.value || null)}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.templateName})
              </option>
            ))}
          </select>
        </div>
        {exportHref ? (
          <a href={exportHref} className={cn(buttonVariants({ variant: "outline" }))}>
            <Download className="mr-2 size-4" aria-hidden />
            Export CSV
          </a>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loadingResults ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : results && selectedClassId != null ? (
        <div className="space-y-6">
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="font-medium">{results.judgingClass.name}</p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground/90">Template:</span>{" "}
              <Link
                href={`/organizer/events/${eventId}/awards-judging/score-sheets`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {results.judgingClass.templateName}
              </Link>
              <span className="text-muted-foreground">
                {" "}
                · {results.judgingClass.totalPoints} pts ·{" "}
                {results.judgingClass.methodology.replace(/_/g, " ")}
              </span>
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              <li>{results.summary.eligibleVehicleCount} vehicles with score sheets</li>
              <li>{results.summary.rankedVehicleCount} ranked</li>
              <li>{results.summary.draftSheetCount} draft sheets</li>
              <li>{results.summary.submittedSheetCount} submitted</li>
              <li>{results.summary.finalizedSheetCount} finalized</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Ranked results</h2>
            {results.ranked.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No submitted score sheets yet.
              </p>
            ) : (
              <ResultsTable
                eventId={eventId}
                judgingClassId={selectedClassId}
                rows={results.ranked}
                emptyMessage="No submitted score sheets yet."
              />
            )}
          </div>

          {results.unrankedDraftOnly.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">
                In progress / save for later (unranked)
              </h2>
              <p className="text-sm text-muted-foreground">
                Interim scores from draft score sheets. Official rankings use
                submitted sheets only.
              </p>
              <ResultsTable
                eventId={eventId}
                judgingClassId={selectedClassId}
                rows={results.unrankedDraftOnly}
                emptyMessage="No draft-only vehicles."
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
