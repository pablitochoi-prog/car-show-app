"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ScoreSheetResultRow } from "@/lib/judging/score-sheet-results";

type JudgingClassOption = {
  id: string;
  name: string;
  templateName: string;
};

function vehicleDetailHref(
  eventId: string,
  judgingClassId: string,
  vehicleEntryCode: string,
): string {
  return `/organizer/events/${eventId}/awards-judging/score-sheets/results/vehicle/${encodeURIComponent(vehicleEntryCode)}?judgingClassId=${encodeURIComponent(judgingClassId)}`;
}

export function OrganizerScoreSheetIndividualPicker({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [classes, setClasses] = useState<JudgingClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<ScoreSheetResultRow[]>([]);
  const [vehicleEntryCode, setVehicleEntryCode] = useState("");
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
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
      const active = list
        .filter((c) => c.isActive)
        .map((c) => ({ id: c.id, name: c.name, templateName: c.templateName }));
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

  const loadVehicles = useCallback(
    async (classId: string) => {
      setLoadingVehicles(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/events/${eventId}/score-sheets/results?judgingClassId=${encodeURIComponent(classId)}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load vehicles.");
        const ranked = (data.ranked ?? []) as ScoreSheetResultRow[];
        const unranked = (data.unrankedDraftOnly ?? []) as ScoreSheetResultRow[];
        setVehicles([...ranked, ...unranked]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load vehicles.");
        setVehicles([]);
      } finally {
        setLoadingVehicles(false);
      }
    },
    [eventId],
  );

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (!selectedClassId) {
      setVehicles([]);
      return;
    }
    void loadVehicles(selectedClassId);
  }, [selectedClassId, loadVehicles]);

  const openByVehicleId = () => {
    const code = vehicleEntryCode.trim();
    if (!code || !selectedClassId) return;
    router.push(vehicleDetailHref(eventId, selectedClassId, code));
  };

  if (loadingClasses) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
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
    );
  }

  return (
    <div className="space-y-8">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">By vehicle ID</h2>
        <p className="text-sm text-muted-foreground">
          Enter a vehicle entry code and judging class to open that vehicle&apos;s
          judge score sheets.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[10rem] flex-1">
            <label htmlFor="vehicle-entry-code" className="text-sm font-medium">
              Vehicle ID
            </label>
            <input
              id="vehicle-entry-code"
              type="text"
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 font-mono text-sm"
              placeholder="e.g. KVE-003"
              value={vehicleEntryCode}
              onChange={(e) => setVehicleEntryCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") openByVehicleId();
              }}
            />
          </div>
          <div className="min-w-[12rem] flex-1">
            <label htmlFor="class-by-id" className="text-sm font-medium">
              Judging class
            </label>
            <select
              id="class-by-id"
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedClassId ?? ""}
              onChange={(e) => setSelectedClassId(e.target.value || null)}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className={cn(buttonVariants())}
            disabled={!vehicleEntryCode.trim() || !selectedClassId}
            onClick={openByVehicleId}
          >
            Open score sheets
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">By judging class</h2>
            <p className="text-sm text-muted-foreground">
              Pick a class, then open individual judge score sheets per vehicle.
            </p>
          </div>
          <div className="min-w-[12rem]">
            <label htmlFor="class-by-class" className="text-sm font-medium">
              Judging class
            </label>
            <select
              id="class-by-class"
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
        </div>

        {loadingVehicles ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : vehicles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No vehicles with score sheets in this class yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="border-b bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Vehicle ID</th>
                  <th className="px-3 py-2 font-medium">Vehicle</th>
                  <th className="px-3 py-2 font-medium">Owner</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {vehicles.map((row) => {
                  const statusParts = [
                    row.draftCount > 0 ? `${row.draftCount} draft` : null,
                    row.submittedCount > 0 ? `${row.submittedCount} submitted` : null,
                    row.finalizedCount > 0 ? `${row.finalizedCount} finalized` : null,
                  ].filter(Boolean);

                  return (
                    <tr key={row.vehicleEntryCode}>
                      <td className="px-3 py-2 font-mono">{row.vehicleEntryCode}</td>
                      <td className="px-3 py-2">
                        {row.year} {row.make} {row.model}
                      </td>
                      <td className="px-3 py-2">{row.ownerName ?? "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {statusParts.length > 0 ? statusParts.join(" · ") : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {selectedClassId ? (
                          <Link
                            href={vehicleDetailHref(
                              eventId,
                              selectedClassId,
                              row.vehicleEntryCode,
                            )}
                            className={cn(
                              buttonVariants({ variant: "outline", size: "sm" }),
                            )}
                          >
                            View sheets
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
