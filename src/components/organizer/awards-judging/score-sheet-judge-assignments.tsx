"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
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

type JudgeOption = { userId: string; name: string; email: string };
type VehicleClassOption = { id: string; name: string; sortOrder?: number };
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
  templateWarning?: string | null;
};

const selectClassName =
  "flex h-9 min-w-[11rem] max-w-[240px] rounded-md border border-input bg-background px-3 text-sm shadow-sm";

function vehicleLabel(v: VehicleRow) {
  const name = [v.year, v.make, v.model].filter(Boolean).join(" ");
  return v.nickname ? `${v.nickname} (${name})` : name;
}

type LinkedSelection = {
  selectedVehicleIds: Set<string>;
  setSelectedVehicleIds: Dispatch<React.SetStateAction<Set<string>>>;
  eventCategoryId: string;
  setEventCategoryId: (id: string) => void;
};

export function ScoreSheetJudgeAssignments({
  eventId,
  onAssignmentsChanged,
  linkedSelection,
  hideVehicleTable = false,
  vehicleClassOptions,
}: {
  eventId: string;
  onAssignmentsChanged?: () => void;
  linkedSelection?: LinkedSelection;
  hideVehicleTable?: boolean;
  /** When embedded on Vehicle Registrations, supply classes from the grid loader. */
  vehicleClassOptions?: VehicleClassOption[];
}) {
  const [internalEventCategoryId, setInternalEventCategoryId] = useState("");
  const eventCategoryId =
    linkedSelection?.eventCategoryId ?? internalEventCategoryId;
  const setEventCategoryId =
    linkedSelection?.setEventCategoryId ?? setInternalEventCategoryId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AssignmentsPayload | null>(null);
  const [internalSelectedVehicleIds, setInternalSelectedVehicleIds] = useState(
    () => new Set<string>(),
  );
  const selectedVehicleIds =
    linkedSelection?.selectedVehicleIds ?? internalSelectedVehicleIds;
  const setSelectedVehicleIds =
    linkedSelection?.setSelectedVehicleIds ?? setInternalSelectedVehicleIds;

  const [selectedJudgeId, setSelectedJudgeId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
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
      setError(json.templateWarning ?? null);

      const vehicles = json.vehicles ?? [];
      if (!linkedSelection && eventCategoryId && vehicles.length > 0) {
        setSelectedVehicleIds(
          new Set(vehicles.map((v) => v.registrationVehicleId)),
        );
      } else if (!linkedSelection && !eventCategoryId) {
        setSelectedVehicleIds(new Set());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [eventId, eventCategoryId, linkedSelection, setSelectedVehicleIds]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSelectedSectionId("");
    setConflicts([]);
    setSummary(null);
  }, [eventCategoryId]);

  const vehicleClassList = useMemo(() => {
    const fromApi = data?.vehicleClasses ?? [];
    if (fromApi.length > 0) return fromApi;
    return vehicleClassOptions ?? [];
  }, [data?.vehicleClasses, vehicleClassOptions]);

  const categories = data?.scorecardCategories?.categories ?? [];
  const templateLabel = data?.scorecardCategories?.templateName;
  const judges = data?.judges ?? [];
  const vehicles = data?.vehicles ?? [];
  const allSelected =
    vehicles.length > 0 &&
    vehicles.every((v) => selectedVehicleIds.has(v.registrationVehicleId));

  const canAssign =
    selectedVehicleIds.size > 0 &&
    selectedJudgeId.length > 0 &&
    selectedSectionId.length > 0 &&
    eventCategoryId.length > 0 &&
    !saving;

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

  async function runAssign() {
    if (!eventCategoryId) {
      setError("Choose a vehicle class first.");
      return;
    }
    if (selectedVehicleIds.size === 0) {
      setError(
        hideVehicleTable
          ? "Select at least one vehicle in the grid above, or choose a class with vehicles listed below."
          : "Select at least one vehicle in the table below.",
      );
      return;
    }
    if (!selectedSectionId) {
      setError("Choose a judging category (e.g. Engine, Exterior).");
      return;
    }
    if (!selectedJudgeId) {
      setError("Choose a judge.");
      return;
    }
    if (!judges.length) {
      setError("Add event staff with the Judge role under Event Staff.");
      return;
    }

    setSaving(true);
    setError(null);
    setConflicts([]);
    try {
      const previewRes = await fetch(
        `/api/events/${eventId}/score-sheets/assignments/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            judgeUserId: selectedJudgeId,
            registrationVehicleIds: [...selectedVehicleIds],
            eventJudgingSectionIds: [selectedSectionId],
          }),
        },
      );
      const previewJson = (await previewRes.json()) as {
        conflicts?: Conflict[];
        error?: string;
      };
      if (!previewRes.ok) {
        throw new Error(previewJson.error ?? "Could not validate assignment.");
      }

      const nextConflicts = previewJson.conflicts ?? [];
      if (nextConflicts.length > 0 && !replaceExisting) {
        setConflicts(nextConflicts);
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/events/${eventId}/score-sheets/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judgeUserId: selectedJudgeId,
          registrationVehicleIds: [...selectedVehicleIds],
          eventJudgingSectionIds: [selectedSectionId],
          replaceExisting: replaceExisting || nextConflicts.length > 0,
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
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Assignment failed.");
      }
      const s = json.summary!;
      setSummary(
        `Assigned ${s.judgeName} to ${s.vehicleCount} vehicle(s) for ${s.categoryCount} categor${s.categoryCount === 1 ? "y" : "ies"} (${s.assignmentsCreated} new, ${s.assignmentsUpdated} updated).`,
      );
      setConflicts([]);
      setReplaceExisting(false);
      await load();
      onAssignmentsChanged?.();
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
            Choose a vehicle class, then the judging category (e.g. Engine), then the
            judge. All vehicles in that class are selected automatically on this page;
            on Vehicle Registrations, filter the grid and tick rows as needed. Example:
            assign every Muscle Car <strong>Engine</strong> to Billy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="vehicle-class-filter">Vehicle class</Label>
              <select
                id="vehicle-class-filter"
                className={selectClassName}
                value={eventCategoryId}
                onChange={(e) => setEventCategoryId(e.target.value)}
                disabled={loading && vehicleClassList.length === 0}
              >
                <option value="">Select vehicle class…</option>
                {vehicleClassList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="assign-category-select">Judging category</Label>
              <select
                id="assign-category-select"
                className={selectClassName}
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                disabled={
                  loading || !eventCategoryId || categories.length === 0
                }
              >
                <option value="">
                  {!eventCategoryId
                    ? "Select vehicle class first…"
                    : loading
                      ? "Loading…"
                      : categories.length === 0
                        ? "No categories for this class"
                        : "Select category…"}
                </option>
                {categories.map((c) => (
                  <option key={c.sectionId} value={c.sectionId}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="assign-judge-select">Judge</Label>
              <select
                id="assign-judge-select"
                className={selectClassName}
                value={selectedJudgeId}
                onChange={(e) => setSelectedJudgeId(e.target.value)}
                disabled={loading || judges.length === 0}
              >
                <option value="">
                  {loading
                    ? "Loading judges…"
                    : judges.length === 0
                      ? "No judges on event"
                      : "Select judge…"}
                </option>
                {judges.map((j) => (
                  <option key={j.userId} value={j.userId}>
                    {j.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              disabled={!canAssign}
              onClick={() => void runAssign()}
            >
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 size-4" />
              )}
              Assign
              {selectedVehicleIds.size > 0
                ? ` (${selectedVehicleIds.size})`
                : ""}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void load()}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>

          {eventCategoryId && templateLabel ? (
            <p className="text-xs text-muted-foreground">
              Score sheet: <span className="font-medium">{templateLabel}</span>
              {data?.scorecardCategories?.judgingClassName
                ? ` · ${data.scorecardCategories.judgingClassName}`
                : null}
            </p>
          ) : null}

          {vehicleClassList.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground">
              No vehicle classes on this event yet. Add registration categories under
              Event setup.
            </p>
          ) : null}

          {eventCategoryId && categories.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground">
              This vehicle class is not linked to a score sheet template. Open Awards
              &amp; Judging → Score Sheet Templates and assign vehicle classes to a
              template.
            </p>
          ) : null}

          {judges.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground">
              No judges listed for this event. Add staff with the{" "}
              <strong>Judge</strong> role under Event Staff.
            </p>
          ) : null}

          {conflicts.length > 0 ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
              <p className="font-medium text-amber-950 dark:text-amber-100">
                {conflicts.length} existing assignment(s) conflict with this change
              </p>
              <ul className="mt-2 max-h-32 list-disc space-y-1 overflow-y-auto pl-4 text-amber-900 dark:text-amber-100/90">
                {conflicts.slice(0, 8).map((c, i) => (
                  <li key={i}>
                    {c.vehicleEntryCode} · {c.sectionName} (currently{" "}
                    {c.currentJudgeName})
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
                Replace existing assignments, then click Assign again
              </label>
            </div>
          ) : null}

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

      {hideVehicleTable ? (
        eventCategoryId && vehicles.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"} in this class.
            {selectedVehicleIds.size > 0
              ? ` ${selectedVehicleIds.size} selected in the grid above.`
              : " Select rows in the grid above, or they are auto-selected on the Assign Judges page."}
          </p>
        ) : eventCategoryId ? (
          <p className="text-sm text-muted-foreground">
            No confirmed vehicles with entry codes in this class.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Choose a vehicle class to see categories for that class’s score sheet.
          </p>
        )
      ) : !eventCategoryId ? (
        <p className="text-sm text-muted-foreground">
          Choose a vehicle class to list confirmed registrations and assign judges.
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
                <th className="w-10 p-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAllVehicles}
                    aria-label="Select all vehicles in this class"
                  />
                </th>
                <th className="p-2">Entry</th>
                <th className="p-2">Vehicle</th>
                <th className="p-2">Current assignments</th>
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
                              <span className="ml-1 text-muted-foreground">
                                ({a.status})
                              </span>
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
    </div>
  );
}
