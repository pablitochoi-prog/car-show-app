"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type JudgeOption = { userId: string; name: string; email: string };
type VehicleClassOption = { id: string; name: string; sortOrder: number };
type CategoryOption = { sectionId: string; name: string; sortOrder: number };
type VehicleRow = {
  registrationVehicleId: string;
  vehicleEntryCode: string;
  nickname: string | null;
  year: number;
  make: string;
  model: string;
  assignments: Array<{
    sectionId: string;
    sectionName: string;
    judgeName: string;
    status: string;
  }>;
};
type Conflict = {
  vehicleEntryCode: string;
  sectionName: string;
  currentJudgeName: string;
};

type AssignmentsPayload = {
  judges: JudgeOption[];
  vehicleClasses: VehicleClassOption[];
  scorecardCategories: {
    judgingClassName: string;
    templateName: string;
    categories: CategoryOption[];
  } | null;
  vehicles: VehicleRow[] | null;
};

function vehicleLabel(v: VehicleRow) {
  const name = [v.year, v.make, v.model].filter(Boolean).join(" ");
  return v.nickname ? `${v.nickname} (${name})` : name;
}

export function ScoreSheetJudgeAssignments({ eventId }: { eventId: string }) {
  const [eventCategoryId, setEventCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AssignmentsPayload | null>(null);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<"judge" | "categories" | "confirm">("judge");
  const [selectedJudgeId, setSelectedJudgeId] = useState("");
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set());
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = eventCategoryId
        ? `?eventCategoryId=${encodeURIComponent(eventCategoryId)}`
        : "";
      const res = await fetch(`/api/events/${eventId}/score-sheets/assignments${qs}`);
      const json = (await res.json()) as AssignmentsPayload & { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load assignment data.");
      }
      setData(json);
      setSelectedVehicleIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [eventId, eventCategoryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const vehicles = data?.vehicles ?? [];
  const categories = data?.scorecardCategories?.categories ?? [];
  const allSelected =
    vehicles.length > 0 && vehicles.every((v) => selectedVehicleIds.has(v.registrationVehicleId));

  const selectedJudge = useMemo(
    () => data?.judges.find((j) => j.userId === selectedJudgeId),
    [data?.judges, selectedJudgeId],
  );

  function toggleVehicle(id: string) {
    setSelectedVehicleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVehicles() {
    if (allSelected) {
      setSelectedVehicleIds(new Set());
    } else {
      setSelectedVehicleIds(new Set(vehicles.map((v) => v.registrationVehicleId)));
    }
  }

  function openAssignDialog() {
    if (selectedVehicleIds.size === 0) {
      setError("Select at least one vehicle.");
      return;
    }
    if (!data?.judges.length) {
      setError("Add staff with the Judge role before assigning.");
      return;
    }
    setStep("judge");
    setSelectedJudgeId("");
    setSelectedSectionIds(new Set());
    setConflicts([]);
    setReplaceExisting(false);
    setDialogOpen(true);
    setError(null);
  }

  async function previewAndAdvance() {
    if (!selectedJudgeId || selectedSectionIds.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/events/${eventId}/score-sheets/assignments/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            judgeUserId: selectedJudgeId,
            registrationVehicleIds: [...selectedVehicleIds],
            eventJudgingSectionIds: [...selectedSectionIds],
          }),
        },
      );
      const json = (await res.json()) as { conflicts?: Conflict[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Preview failed.");
      setConflicts(json.conflicts ?? []);
      setStep("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAssignments() {
    if (!selectedJudgeId || selectedSectionIds.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/score-sheets/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judgeUserId: selectedJudgeId,
          registrationVehicleIds: [...selectedVehicleIds],
          eventJudgingSectionIds: [...selectedSectionIds],
          replaceExisting: replaceExisting || conflicts.length > 0,
        }),
      });
      const json = (await res.json()) as {
        summary?: {
          judgeName: string;
          vehicleCount: number;
          categoryCount: number;
          assignmentsCreated: number;
          assignmentsUpdated: number;
        };
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        if (json.code === "CONFLICTS") {
          setConflicts([]);
          setStep("confirm");
        }
        throw new Error(json.error ?? "Assignment failed.");
      }
      const s = json.summary!;
      setSummary(
        `Assigned ${s.judgeName} to ${s.vehicleCount} vehicle(s) across ${s.categoryCount} categor${s.categoryCount === 1 ? "y" : "ies"} (${s.assignmentsCreated} new, ${s.assignmentsUpdated} updated).`,
      );
      setDialogOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assignment failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Assign judges to scorecard categories</CardTitle>
          <CardDescription>
            Filter by vehicle class, select vehicles, then assign event judges to one or more
            scorecard categories. Each judge gets one score sheet per vehicle; category rows track
            what they may edit in Phase 5E.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="vehicle-class-filter">Vehicle class</Label>
              <select
                id="vehicle-class-filter"
                className="flex h-9 min-w-[200px] rounded-md border border-input bg-background px-3 text-sm"
                value={eventCategoryId}
                onChange={(e) => setEventCategoryId(e.target.value)}
              >
                <option value="">Select a class…</option>
                {(data?.vehicleClasses ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              disabled={!eventCategoryId || selectedVehicleIds.size === 0}
              onClick={openAssignDialog}
            >
              <UserPlus className="mr-2 size-4" />
              Assign judges
            </Button>
            <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
          </div>

          {summary ? (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
              {summary}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {!eventCategoryId ? (
        <p className="text-sm text-muted-foreground">
          Choose a vehicle class to list confirmed registrations with entry codes.
        </p>
      ) : loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading vehicles…
        </div>
      ) : vehicles.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No confirmed vehicles with entry codes in this class.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="p-2 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAllVehicles}
                    aria-label="Select all vehicles"
                  />
                </th>
                <th className="p-2">Entry</th>
                <th className="p-2">Vehicle</th>
                <th className="p-2">Assignments</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.registrationVehicleId} className="border-b last:border-0">
                  <td className="p-2 align-top">
                    <input
                      type="checkbox"
                      checked={selectedVehicleIds.has(v.registrationVehicleId)}
                      onChange={() => toggleVehicle(v.registrationVehicleId)}
                      aria-label={`Select ${v.vehicleEntryCode}`}
                    />
                  </td>
                  <td className="p-2 align-top font-mono">{v.vehicleEntryCode}</td>
                  <td className="p-2 align-top">{vehicleLabel(v)}</td>
                  <td className="p-2 align-top">
                    {v.assignments.length === 0 ? (
                      <span className="text-muted-foreground">None</span>
                    ) : (
                      <ul className="flex flex-wrap gap-1">
                        {v.assignments.map((a) => (
                          <li key={`${a.sectionId}-${a.judgeName}`}>
                            <Badge variant="secondary" className="font-normal">
                              {a.sectionName}: {a.judgeName}
                              <span className="ml-1 text-muted-foreground">({a.status})</span>
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setDialogOpen(false)}
            aria-hidden
          />
          <div
            className="relative mx-4 flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-xl border bg-background p-6 shadow-lg"
            role="dialog"
            aria-labelledby="assign-judge-title"
          >
            <button
              type="button"
              className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:text-foreground"
              onClick={() => setDialogOpen(false)}
            >
              <X className="size-4" />
            </button>
            <h2 id="assign-judge-title" className="text-lg font-semibold pr-8">
              Assign judge
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedVehicleIds.size} vehicle(s) selected
              {data?.scorecardCategories
                ? ` · ${data.scorecardCategories.judgingClassName} / ${data.scorecardCategories.templateName}`
                : ""}
            </p>

          {step === "judge" ? (
            <div className="space-y-2">
              <Label>Judge</Label>
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                {data?.judges.map((j) => (
                  <li key={j.userId}>
                    <button
                      type="button"
                      className={cn(
                        "w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted",
                        selectedJudgeId === j.userId && "bg-muted font-medium",
                      )}
                      onClick={() => setSelectedJudgeId(j.userId)}
                    >
                      {j.name}
                      <span className="block text-xs text-muted-foreground">{j.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {step === "categories" ? (
            <div className="space-y-2">
              <Label>Scorecard categories</Label>
              <ul className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
                {categories.map((c) => (
                  <li key={c.sectionId}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted">
                      <input
                        type="checkbox"
                        checked={selectedSectionIds.has(c.sectionId)}
                        onChange={() => {
                          setSelectedSectionIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(c.sectionId)) next.delete(c.sectionId);
                            else next.add(c.sectionId);
                            return next;
                          });
                        }}
                      />
                      <span className="text-sm">{c.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {step === "confirm" ? (
            <div className="space-y-3 text-sm">
              <p>
                <strong>{selectedJudge?.name}</strong> will be assigned to{" "}
                <strong>{selectedVehicleIds.size}</strong> vehicle(s) and{" "}
                <strong>{selectedSectionIds.size}</strong> categor
                {selectedSectionIds.size === 1 ? "y" : "ies"}.
              </p>
              {conflicts.length > 0 ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-50 p-3 dark:bg-amber-950/30">
                  <p className="font-medium text-amber-950 dark:text-amber-100">
                    {conflicts.length} existing assignment(s) will be replaced
                  </p>
                  <ul className="mt-2 max-h-32 list-disc space-y-1 overflow-y-auto pl-4 text-amber-900 dark:text-amber-100/90">
                    {conflicts.slice(0, 8).map((c, i) => (
                      <li key={i}>
                        {c.vehicleEntryCode} · {c.sectionName} (currently {c.currentJudgeName})
                      </li>
                    ))}
                    {conflicts.length > 8 ? (
                      <li>…and {conflicts.length - 8} more</li>
                    ) : null}
                  </ul>
                  <label className="mt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={replaceExisting}
                      onChange={(e) => setReplaceExisting(e.target.checked)}
                    />
                    Replace existing assignments
                  </label>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            {step === "judge" ? (
              <>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!selectedJudgeId}
                  onClick={() => setStep("categories")}
                >
                  Next: categories
                </Button>
              </>
            ) : null}
            {step === "categories" ? (
              <>
                <Button type="button" variant="outline" onClick={() => setStep("judge")}>
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={selectedSectionIds.size === 0 || saving}
                  onClick={() => void previewAndAdvance()}
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : "Review"}
                </Button>
              </>
            ) : null}
            {step === "confirm" ? (
              <>
                <Button type="button" variant="outline" onClick={() => setStep("categories")}>
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={saving || (conflicts.length > 0 && !replaceExisting)}
                  onClick={() => void saveAssignments()}
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : "Save assignments"}
                </Button>
              </>
            ) : null}
          </div>
          </div>
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Also available from{" "}
        <Link
          href={`/organizer/events/${eventId}/registrations`}
          className="text-primary underline-offset-4 hover:underline"
        >
          Event Registrations
        </Link>{" "}
        (filter by class there, then use this page to assign).
      </p>
    </div>
  );
}
