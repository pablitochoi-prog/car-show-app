"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ScoreSheetJudgeAssignments } from "@/components/organizer/awards-judging/score-sheet-judge-assignments";
import { VehicleRegistrationsGrid } from "@/components/organizer/vehicle-registrations-grid";
import type { VehicleRegistrationsGrid as GridData } from "@/lib/vehicle-registrations-grid-types";
import { Button } from "@/components/ui/button";

const EMPTY_GRID: GridData = {
  scoreSheetJudgingEnabled: false,
  categories: [],
  vehicleClasses: [],
  rows: [],
};

type Props = {
  eventId: string;
};

export function VehicleRegistrationsWorkspace({ eventId }: Props) {
  const router = useRouter();
  const [grid, setGrid] = useState<GridData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [eventCategoryId, setEventCategoryId] = useState("");

  const loadGrid = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/vehicle-registrations`, {
        credentials: "same-origin",
      });
      const json = (await res.json()) as GridData & { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load vehicle registrations.");
      }
      setGrid({
        scoreSheetJudgingEnabled: json.scoreSheetJudgingEnabled ?? false,
        categories: json.categories ?? [],
        vehicleClasses: json.vehicleClasses ?? [],
        rows: json.rows ?? [],
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load.");
      setGrid(null);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadGrid();
  }, [loadGrid]);

  const onAssignmentsChanged = useCallback(() => {
    void loadGrid();
    router.refresh();
  }, [loadGrid, router]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        Loading vehicle registrations…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-6">
        <p className="text-sm font-medium text-destructive">Could not load vehicles</p>
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadGrid()}>
          Try again
        </Button>
      </div>
    );
  }

  const data = grid ?? EMPTY_GRID;

  return (
    <div className="space-y-10">
      <VehicleRegistrationsGrid
        eventId={eventId}
        scoreSheetJudgingEnabled={data.scoreSheetJudgingEnabled}
        categories={data.categories}
        vehicleClasses={data.vehicleClasses}
        rows={data.rows}
        selectedVehicleIds={selectedVehicleIds}
        onSelectedVehicleIdsChange={setSelectedVehicleIds}
        eventCategoryId={eventCategoryId}
        onEventCategoryIdChange={setEventCategoryId}
      />
      {data.scoreSheetJudgingEnabled ? (
        <ScoreSheetJudgeAssignments
          eventId={eventId}
          hideVehicleTable
          vehicleClassOptions={data.vehicleClasses.map((c) => ({
            id: c.id,
            name: c.name,
            sortOrder: c.sortOrder,
          }))}
          linkedSelection={{
            selectedVehicleIds,
            setSelectedVehicleIds,
            eventCategoryId,
            setEventCategoryId,
          }}
          onAssignmentsChanged={onAssignmentsChanged}
        />
      ) : null}
    </div>
  );
}
