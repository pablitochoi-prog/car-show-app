"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Printer } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OrganizerScoreSheetReadOnly } from "@/components/organizer/awards-judging/organizer-score-sheet-read-only";
import type { OrganizerVehicleScoreSheetDetail } from "@/lib/judging/organizer-score-sheet-vehicle-detail";

export function OrganizerScoreSheetVehicleDetail({
  eventId,
  judgingClassId,
  vehicleEntryCode,
}: {
  eventId: string;
  judgingClassId: string;
  vehicleEntryCode: string;
}) {
  const [detail, setDetail] = useState<OrganizerVehicleScoreSheetDetail | null>(null);
  const [includeDrafts, setIncludeDrafts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resultsHref = `/organizer/events/${eventId}/awards-judging/score-sheets/results?judgingClassId=${encodeURIComponent(judgingClassId)}`;

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        judgingClassId,
        vehicleEntryCode,
      });
      if (includeDrafts) params.set("includeDrafts", "1");
      const res = await fetch(
        `/api/events/${eventId}/score-sheets/results/vehicle-detail?${params}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load score sheets.");
      setDetail(data as OrganizerVehicleScoreSheetDetail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [eventId, judgingClassId, vehicleEntryCode, includeDrafts]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error ?? "Score sheets not found."}
      </p>
    );
  }

  const vehicle = detail.vehicle;

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Link href={resultsHref} className={cn(buttonVariants({ variant: "outline" }))}>
          ← Back to results
        </Link>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline" }))}
          onClick={() => window.print()}
        >
          <Printer className="mr-2 size-4" aria-hidden />
          Print
        </button>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeDrafts}
            onChange={(e) => setIncludeDrafts(e.target.checked)}
          />
          Show draft score sheets
        </label>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <p className="font-medium text-lg font-mono">{vehicleEntryCode}</p>
        {vehicle ? (
          <>
            {vehicle.vehicleNickname ? (
              <p className="font-medium">{vehicle.vehicleNickname}</p>
            ) : null}
            <p className="text-muted-foreground">
              {vehicle.year} {vehicle.make} {vehicle.model} · {vehicle.vehicleClass}
            </p>
            {vehicle.ownerName ? (
              <p className="text-muted-foreground">Owner: {vehicle.ownerName}</p>
            ) : null}
          </>
        ) : null}
        <p className="mt-2 text-muted-foreground">
          Judging class: <span className="text-foreground">{detail.judgingClass.name}</span>
        </p>
        <p className="text-muted-foreground">
          Template:{" "}
          <Link
            href={`/organizer/events/${eventId}/awards-judging/score-sheets`}
            className="font-medium text-primary underline-offset-4 hover:underline print:no-underline"
          >
            {detail.judgingClass.templateName}
          </Link>
          {" · "}
          {detail.judgingClass.totalPoints} pts ·{" "}
          {detail.judgingClass.methodology.replace(/_/g, " ")}
        </p>
        <p className="mt-2 font-medium text-foreground">
          Official average:{" "}
          {detail.officialSummary.officialScore != null
            ? detail.officialSummary.officialScore
            : "—"}{" "}
          · {detail.officialSummary.judgeCount} judge
          {detail.officialSummary.judgeCount === 1 ? "" : "s"}
          {detail.officialSummary.highScore != null ? (
            <span className="font-normal text-muted-foreground">
              {" "}
              (high {detail.officialSummary.highScore}, low{" "}
              {detail.officialSummary.lowScore}, spread{" "}
              {detail.officialSummary.scoreSpread})
            </span>
          ) : null}
        </p>
      </div>

      {detail.scoringSheets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No submitted or finalized score sheets for this vehicle.
        </p>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Submitted judge score sheets</h2>
          {detail.scoringSheets.map((sheet) => (
            <OrganizerScoreSheetReadOnly key={sheet.sheetId} sheet={sheet} />
          ))}
        </div>
      )}

      {includeDrafts && detail.draftSheets.length > 0 ? (
        <div className="space-y-4 border-t pt-6">
          <h2 className="text-lg font-semibold text-muted-foreground">
            Draft score sheets (not in official results)
          </h2>
          {detail.draftSheets.map((sheet) => (
            <OrganizerScoreSheetReadOnly key={sheet.sheetId} sheet={sheet} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
