"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { JudgeStaffMultiSelect } from "@/components/forms/judge-staff-multi-select";
import { SpecialJudgeMultiSelect } from "@/components/forms/special-judge-multi-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type VehicleClassOption = { id: string; label: string };
type JudgeOption = { userId: string; name: string; email: string };

type BallotCategory = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  status: "DRAFT" | "OPEN" | "CLOSED" | "FINALIZED";
  votesPerJudge: number;
  maxVotesPerJudgePerVehicle: number;
  requiresSpecialJudge: boolean;
  judgeGuidance: string | null;
  eventAwardId: string | null;
  eligibleClasses: { eventCategoryId: string }[];
  judgeAssignments: { judgeUserId: string }[];
  specialJudgeAssignments: { judgeUserId: string }[];
  _count: { votes: number; allocations: number };
};

type ResultRow = {
  rank: number;
  vehicleEntryCode: string;
  vehicleNickname: string | null;
  year: number;
  make: string;
  model: string;
  vehicleClass: string;
  totalVotes: number;
  judgeCount: number;
  isTied: boolean;
};

const STATUS_LABELS: Record<BallotCategory["status"], string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  CLOSED: "Closed",
  FINALIZED: "Finalized",
};

/** Stands out so organizers can find “stop voting” actions quickly. */
const CLOSE_VOTING_BUTTON_CLASS =
  "border-amber-500 bg-amber-100 font-semibold text-amber-950 shadow-sm hover:bg-amber-200 dark:border-amber-400 dark:bg-amber-500/30 dark:text-amber-50 dark:hover:bg-amber-500/45";

function statusVariant(
  status: BallotCategory["status"],
): "default" | "secondary" | "outline" | "success" | "warning" {
  switch (status) {
    case "OPEN":
      return "success";
    case "FINALIZED":
      return "secondary";
    case "CLOSED":
      return "warning";
    default:
      return "outline";
  }
}

type VehicleClassRowState = {
  eventCategoryId: string;
  label: string;
  selected: boolean;
  judgeGuidance: string;
};

type CreateFormState = {
  votesPerJudge: number;
  maxVotesPerJudgePerVehicle: number;
  vehicleClassRows: VehicleClassRowState[];
};

type EditFormState = {
  votesPerJudge: number;
  maxVotesPerJudgePerVehicle: number;
  requiresSpecialJudge: boolean;
  judgeGuidance: string;
  /** Checked judges may vote; all checked = entire event judge panel. */
  participatingJudgeUserIds: string[];
  assignedSpecialJudgeUserIds: string[];
};

function emptyCreateForm(availableClasses: VehicleClassOption[]): CreateFormState {
  return {
    votesPerJudge: 10,
    maxVotesPerJudgePerVehicle: 1,
    vehicleClassRows: availableClasses.map((vc) => ({
      eventCategoryId: vc.id,
      label: vc.label,
      selected: false,
      judgeGuidance: "",
    })),
  };
}

function categoryToEditForm(
  cat: BallotCategory,
  eventJudges: JudgeOption[],
): EditFormState {
  const allJudgeIds = eventJudges.map((j) => j.userId);
  const restricted = cat.judgeAssignments.map((j) => j.judgeUserId);
  const participatingJudgeUserIds =
    restricted.length === 0 ? [...allJudgeIds] : restricted;

  return {
    votesPerJudge: cat.votesPerJudge,
    maxVotesPerJudgePerVehicle: cat.maxVotesPerJudgePerVehicle,
    requiresSpecialJudge: cat.requiresSpecialJudge,
    judgeGuidance: cat.judgeGuidance ?? "",
    participatingJudgeUserIds,
    assignedSpecialJudgeUserIds: cat.specialJudgeAssignments.map(
      (j) => j.judgeUserId,
    ),
  };
}

function assignedJudgeIdsForSave(
  allJudgeIds: string[],
  participatingJudgeUserIds: string[],
): string[] {
  if (participatingJudgeUserIds.length === 0) return [];
  if (participatingJudgeUserIds.length >= allJudgeIds.length) return [];
  return participatingJudgeUserIds;
}

function judgeDisplayName(
  userId: string,
  eventJudges: JudgeOption[],
  eventSpecialJudges: JudgeOption[],
): string {
  return (
    eventJudges.find((j) => j.userId === userId)?.name ??
    eventSpecialJudges.find((j) => j.userId === userId)?.name ??
    "Judge"
  );
}

function configuredClassIds(categories: BallotCategory[]): Set<string> {
  const ids = new Set<string>();
  for (const cat of categories) {
    for (const ec of cat.eligibleClasses) {
      ids.add(ec.eventCategoryId);
    }
  }
  return ids;
}

function BallotVoteSettingsFields({
  votesPerJudge,
  maxVotesPerJudgePerVehicle,
  onChange,
  disabled,
  allowMaxVotesEdit,
  idPrefix,
  layout = "stacked",
}: {
  votesPerJudge: number;
  maxVotesPerJudgePerVehicle: number;
  onChange: (patch: {
    votesPerJudge?: number;
    maxVotesPerJudgePerVehicle?: number;
  }) => void;
  disabled?: boolean;
  allowMaxVotesEdit?: boolean;
  idPrefix: string;
  layout?: "stacked" | "compact";
}) {
  const gridClass =
    layout === "compact" ? "grid grid-cols-2 gap-3" : "grid gap-4 sm:grid-cols-2";

  return (
    <div className={gridClass}>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-votes-per-judge`} className="text-xs">
          Max votes per judge
        </Label>
        <Input
          id={`${idPrefix}-votes-per-judge`}
          type="number"
          min={1}
          className="h-8"
          value={votesPerJudge}
          onChange={(e) =>
            onChange({
              votesPerJudge: Math.max(1, parseInt(e.target.value, 10) || 1),
            })
          }
          disabled={disabled && !allowMaxVotesEdit}
        />
        {layout === "stacked" ? (
          <p className="text-xs text-muted-foreground">
            Default 10. Each judge may cast up to this many votes in the class.
          </p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-max-per-vehicle`} className="text-xs">
          Max votes per vehicle
        </Label>
        <Input
          id={`${idPrefix}-max-per-vehicle`}
          type="number"
          min={1}
          className="h-8"
          value={maxVotesPerJudgePerVehicle}
          onChange={(e) =>
            onChange({
              maxVotesPerJudgePerVehicle: Math.max(
                1,
                parseInt(e.target.value, 10) || 1,
              ),
            })
          }
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function VehicleClassVotingPicker({
  rows,
  onChange,
  disabled,
}: {
  rows: VehicleClassRowState[];
  onChange: (rows: VehicleClassRowState[]) => void;
  disabled?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        All vehicle classes already have judge ballot voting configured, or none
        are defined on the event yet. Add classes under Awards and Categories on
        Edit Event.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Label>Eligible vehicle classes</Label>
      <p className="text-xs text-muted-foreground">
        Each selected class becomes its own judge ballot category (the class name
        is the award name). Add optional judge guidance for that class only when
        it is selected.
      </p>
      <ul className="space-y-3 rounded-md border p-3">
        {rows.map((row) => (
          <li
            key={row.eventCategoryId}
            className="space-y-2 border-b border-border/60 pb-3 last:border-0 last:pb-0"
          >
            <label className="flex cursor-pointer items-start gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={row.selected}
                disabled={disabled}
                className="mt-0.5 size-4 shrink-0 rounded border"
                onChange={() => {
                  onChange(
                    rows.map((r) =>
                      r.eventCategoryId === row.eventCategoryId
                        ? {
                            ...r,
                            selected: !r.selected,
                            judgeGuidance: !r.selected ? r.judgeGuidance : "",
                          }
                        : r,
                    ),
                  );
                }}
              />
              {row.label}
            </label>
            {row.selected ? (
              <div className="ml-6 space-y-1">
                <Label
                  htmlFor={`class-guidance-${row.eventCategoryId}`}
                  className="text-xs font-normal text-muted-foreground"
                >
                  Judge guidance / clarification (optional)
                </Label>
                <Textarea
                  id={`class-guidance-${row.eventCategoryId}`}
                  value={row.judgeGuidance}
                  disabled={disabled}
                  rows={2}
                  placeholder="Notes for judges voting in this class…"
                  onChange={(e) => {
                    onChange(
                      rows.map((r) =>
                        r.eventCategoryId === row.eventCategoryId
                          ? { ...r, judgeGuidance: e.target.value }
                          : r,
                      ),
                    );
                  }}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CreateBallotCategoryForm({
  form,
  setForm,
  disabled,
}: {
  form: CreateFormState;
  setForm: (f: CreateFormState) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <VehicleClassVotingPicker
        rows={form.vehicleClassRows}
        onChange={(vehicleClassRows) => setForm({ ...form, vehicleClassRows })}
        disabled={disabled}
      />
      <BallotVoteSettingsFields
        votesPerJudge={form.votesPerJudge}
        maxVotesPerJudgePerVehicle={form.maxVotesPerJudgePerVehicle}
        onChange={(patch) => setForm({ ...form, ...patch })}
        disabled={disabled}
        idPrefix="create-ballot"
      />
      <p className="text-xs text-muted-foreground">
        After creating a category, use Edit on its card to assign a special judge
        or limit which judges vote on that class or award.
      </p>
    </div>
  );
}

function EditBallotCategoryForm({
  form,
  setForm,
  categoryLabel,
  isSpecialAward,
  eventJudges,
  eventSpecialJudges,
  disabled,
}: {
  form: EditFormState;
  setForm: (f: EditFormState) => void;
  categoryLabel: string;
  isSpecialAward: boolean;
  eventJudges: JudgeOption[];
  eventSpecialJudges: JudgeOption[];
  disabled?: boolean;
}) {
  const allJudgeIds = eventJudges.map((j) => j.userId);

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div className="space-y-2">
        <Label htmlFor="edit-class-guidance">
          Judge guidance / clarification (optional)
        </Label>
        <Textarea
          id="edit-class-guidance"
          value={form.judgeGuidance}
          onChange={(e) => setForm({ ...form, judgeGuidance: e.target.value })}
          rows={2}
          disabled={disabled}
          className="text-sm"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.requiresSpecialJudge}
          onChange={(e) =>
            setForm({
              ...form,
              requiresSpecialJudge: e.target.checked,
              participatingJudgeUserIds: e.target.checked
                ? []
                : form.participatingJudgeUserIds.length === 0
                  ? [...allJudgeIds]
                  : form.participatingJudgeUserIds,
              assignedSpecialJudgeUserIds: e.target.checked
                ? form.assignedSpecialJudgeUserIds
                : [],
            })
          }
          disabled={disabled}
          className="size-4 rounded border"
        />
        Special judge category (only selected Special Judges vote)
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 md:pr-2">
          <p className="text-xs font-medium text-muted-foreground">
            {isSpecialAward ? "Special award" : "Vehicle class"}: {categoryLabel}
          </p>
          <BallotVoteSettingsFields
            votesPerJudge={form.votesPerJudge}
            maxVotesPerJudgePerVehicle={form.maxVotesPerJudgePerVehicle}
            onChange={(patch) => setForm({ ...form, ...patch })}
            disabled={disabled}
            idPrefix="edit-ballot"
            layout="compact"
          />
        </div>

        <div className="md:border-l md:pl-4">
          {form.requiresSpecialJudge ? (
            <div className="space-y-2">
              <Label>Special judges</Label>
              <p className="text-xs text-muted-foreground">
                Event staff with the Special Judge role.
              </p>
              <SpecialJudgeMultiSelect
                staff={eventSpecialJudges}
                selectedUserIds={form.assignedSpecialJudgeUserIds}
                onSelectedUserIdsChange={(ids) =>
                  setForm({ ...form, assignedSpecialJudgeUserIds: ids })
                }
                disabled={disabled}
              />
            </div>
          ) : (
            <JudgeStaffMultiSelect
              judges={eventJudges}
              selectedUserIds={form.participatingJudgeUserIds}
              onSelectedUserIdsChange={(ids) =>
                setForm({ ...form, participatingJudgeUserIds: ids })
              }
              disabled={disabled}
              label="Event judges"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function categoryDisplayTitle(
  cat: BallotCategory,
  vehicleClasses: VehicleClassOption[],
): string {
  if (cat.eventAwardId) return cat.name;
  if (cat.eligibleClasses.length === 1) {
    const id = cat.eligibleClasses[0]!.eventCategoryId;
    return vehicleClasses.find((vc) => vc.id === id)?.label ?? cat.name;
  }
  return cat.name;
}

function compactCategorySubtitle(
  cat: BallotCategory,
  eventJudges: JudgeOption[],
  eventSpecialJudges: JudgeOption[],
): string {
  const voteLimit = `Maximum of ${cat.votesPerJudge} vote${cat.votesPerJudge === 1 ? "" : "s"} in this category`;
  const allJudgeCount = eventJudges.length;

  let judgePart: string;
  if (cat.requiresSpecialJudge) {
    if (cat.specialJudgeAssignments.length === 0) {
      judgePart = "Special judges not assigned";
    } else {
      const names = cat.specialJudgeAssignments.map((j) =>
        judgeDisplayName(j.judgeUserId, eventJudges, eventSpecialJudges),
      );
      judgePart = `${names.join(", ")} vote`;
    }
  } else if (
    cat.judgeAssignments.length === 0 ||
    cat.judgeAssignments.length >= allJudgeCount
  ) {
    judgePart = "All judges vote";
  } else {
    const names = cat.judgeAssignments.map((j) =>
      judgeDisplayName(j.judgeUserId, eventJudges, eventSpecialJudges),
    );
    judgePart = `${names.join(", ")} vote`;
  }

  const prefix = cat.eventAwardId ? "Special award. " : "";
  return `${prefix}${judgePart}, ${voteLimit}.`;
}

function ResultsTable({ rows }: { rows: ResultRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No votes recorded yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Rank</th>
            <th className="py-2 pr-3 font-medium">Entry Code</th>
            <th className="py-2 pr-3 font-medium">Vehicle</th>
            <th className="py-2 pr-3 font-medium">Vehicle Class</th>
            <th className="py-2 pr-3 font-medium">Total Votes</th>
            <th className="py-2 font-medium">Judges</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.vehicleEntryCode} className="border-b last:border-0">
              <td className="py-2 pr-3">
                {row.rank}
                {row.isTied ? (
                  <span className="ml-1 text-xs text-amber-600">(tie)</span>
                ) : null}
              </td>
              <td className="py-2 pr-3 font-mono">{row.vehicleEntryCode}</td>
              <td className="py-2 pr-3">
                {row.vehicleNickname ? (
                  <span className="font-medium">{row.vehicleNickname}</span>
                ) : null}
                <span className={row.vehicleNickname ? " block text-xs text-muted-foreground" : ""}>
                  {row.year} {row.make} {row.model}
                </span>
              </td>
              <td className="py-2 pr-3">{row.vehicleClass}</td>
              <td className="py-2 pr-3 font-medium">{row.totalVotes}</td>
              <td className="py-2">{row.judgeCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function JudgeBallotAdmin({
  eventId,
  vehicleClasses,
  eventJudges,
  eventSpecialJudges,
}: {
  eventId: string;
  vehicleClasses: VehicleClassOption[];
  eventJudges: JudgeOption[];
  eventSpecialJudges: JudgeOption[];
}) {
  const [categories, setCategories] = useState<BallotCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);

  const availableVehicleClasses = useMemo(() => {
    const used = configuredClassIds(categories);
    return vehicleClasses.filter((vc) => !used.has(vc.id));
  }, [categories, vehicleClasses]);

  const [createForm, setCreateForm] = useState<CreateFormState>(() =>
    emptyCreateForm(vehicleClasses),
  );
  const prevShowCreate = useRef(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    if (showCreate && !prevShowCreate.current) {
      setCreateForm(emptyCreateForm(availableVehicleClasses));
    }
    prevShowCreate.current = showCreate;
  }, [showCreate, availableVehicleClasses]);

  const ballotOpenCount = useMemo(
    () => categories.filter((c) => c.status === "OPEN").length,
    [categories],
  );
  const ballotCanOpenCount = useMemo(
    () =>
      categories.filter(
        (c) => c.status === "DRAFT" || c.status === "CLOSED",
      ).length,
    [categories],
  );
  const anyBallotOpen = ballotOpenCount > 0;

  const [busyId, setBusyId] = useState<string | null>(null);
  const [resultsOpenId, setResultsOpenId] = useState<string | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/judge-ballot/categories`, {
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        categories?: BallotCategory[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load categories.");
      setCategories(data.categories ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  async function handleCreate() {
    const selected = createForm.vehicleClassRows.filter((row) => row.selected);
    if (selected.length === 0) {
      setError("Select at least one vehicle class.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const shared = {
        votesPerJudge: createForm.votesPerJudge,
        maxVotesPerJudgePerVehicle: createForm.maxVotesPerJudgePerVehicle,
        requiresSpecialJudge: false,
      };

      for (const row of selected) {
        const res = await fetch(
          `/api/events/${eventId}/judge-ballot/categories`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              eventCategoryId: row.eventCategoryId,
              name: row.label,
              judgeGuidance: row.judgeGuidance.trim() || undefined,
              ...shared,
            }),
          },
        );
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Create failed.");
      }

      setShowCreate(false);
      await loadCategories();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setCreating(false);
    }
  }

  async function handleBulkBallotVoting(action: "open_all" | "close_all") {
    setBulkBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/events/${eventId}/judge-ballot/bulk-voting`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ action }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Bulk action failed.");
      await loadCategories();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk action failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleSaveEdit(catId: string) {
    if (!editForm) return;
    setBusyId(catId);
    setError("");
    const allJudgeIds = eventJudges.map((j) => j.userId);
    try {
      const res = await fetch(
        `/api/events/${eventId}/judge-ballot/categories/${catId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            votesPerJudge: editForm.votesPerJudge,
            maxVotesPerJudgePerVehicle: editForm.maxVotesPerJudgePerVehicle,
            judgeGuidance: editForm.judgeGuidance.trim() || null,
            requiresSpecialJudge: editForm.requiresSpecialJudge,
            assignedJudgeUserIds: editForm.requiresSpecialJudge
              ? []
              : assignedJudgeIdsForSave(
                  allJudgeIds,
                  editForm.participatingJudgeUserIds,
                ),
            assignedSpecialJudgeUserIds: editForm.requiresSpecialJudge
              ? editForm.assignedSpecialJudgeUserIds
              : [],
          }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed.");
      setEditingId(null);
      await loadCategories();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAction(
    catId: string,
    action: "open" | "close" | "finalize",
  ) {
    setBusyId(catId);
    setError("");
    try {
      const res = await fetch(
        `/api/events/${eventId}/judge-ballot/categories/${catId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ action }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Action failed.");
      await loadCategories();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function loadResults(catId: string) {
    if (resultsOpenId === catId) {
      setResultsOpenId(null);
      return;
    }
    setResultsOpenId(catId);
    setResultsLoading(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/judge-ballot/results?categoryId=${encodeURIComponent(catId)}`,
        { credentials: "same-origin" },
      );
      const data = (await res.json()) as {
        results?: ResultRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load results.");
      setResults(data.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load results.");
      setResults([]);
    } finally {
      setResultsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Add vehicle class voting</CardTitle>
            {!showCreate ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="mr-1 size-4" aria-hidden />
                New
              </Button>
            ) : null}
          </div>
        </CardHeader>
        {showCreate ? (
          <CardContent className="space-y-4">
            <CreateBallotCategoryForm
              form={createForm}
              setForm={setCreateForm}
              disabled={creating}
            />
            <div className="flex gap-2">
              <Button onClick={() => void handleCreate()} disabled={creating}>
                {creating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                ) : null}
                Add selected classes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Click New to enable judge ballot voting for one or more vehicle
              classes from your event setup. Each class is its own voting category.
            </p>
          </CardContent>
        )}
      </Card>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading award categories…
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-5" aria-hidden />
              No award categories yet
            </CardTitle>
            <CardDescription>
              Create your first award category to let judges allocate votes.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
            <p className="text-sm text-muted-foreground">
              {ballotOpenCount}/{categories.length} open
            </p>
            {anyBallotOpen ? (
              <Button
                type="button"
                size="sm"
                className={CLOSE_VOTING_BUTTON_CLASS}
                disabled={bulkBusy || ballotOpenCount === 0}
                onClick={() => void handleBulkBallotVoting("close_all")}
              >
                {bulkBusy ? (
                  <Loader2 className="mr-1 size-4 animate-spin" aria-hidden />
                ) : null}
                Close all Ballot Voting
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={bulkBusy || ballotCanOpenCount === 0}
                onClick={() => void handleBulkBallotVoting("open_all")}
              >
                {bulkBusy ? (
                  <Loader2 className="mr-1 size-4 animate-spin" aria-hidden />
                ) : null}
                Open all Ballot Voting
              </Button>
            )}
          </div>
          {categories.map((cat) => {
            const isEditing = editingId === cat.id;
            const isBusy = busyId === cat.id;
            const canEdit = cat.status !== "FINALIZED";
            const canOpen =
              cat.status === "DRAFT" || cat.status === "CLOSED";
            const canClose = cat.status === "OPEN";
            const canFinalize =
              cat.status === "OPEN" || cat.status === "CLOSED";

            return (
              <Card key={cat.id} className="gap-0 py-0">
                <CardHeader className="gap-1 px-4 py-3 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">
                      {categoryDisplayTitle(cat, vehicleClasses)}
                    </CardTitle>
                    <Badge variant={statusVariant(cat.status)}>
                      {STATUS_LABELS[cat.status]}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs leading-snug">
                    {compactCategorySubtitle(
                      cat,
                      eventJudges,
                      eventSpecialJudges,
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 px-4 pb-3 pt-0">
                  {isEditing && editForm ? (
                    <EditBallotCategoryForm
                      form={editForm}
                      setForm={setEditForm}
                      categoryLabel={categoryDisplayTitle(cat, vehicleClasses)}
                      isSpecialAward={Boolean(cat.eventAwardId)}
                      eventJudges={eventJudges}
                      eventSpecialJudges={eventSpecialJudges}
                      disabled={isBusy}
                    />
                  ) : cat.judgeGuidance ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground italic">
                      {cat.judgeGuidance}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {canEdit && !isEditing ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => {
                          setEditingId(cat.id);
                          setEditForm(categoryToEditForm(cat, eventJudges));
                        }}
                      >
                        Edit
                      </Button>
                    ) : null}
                    {isEditing ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => void handleSaveEdit(cat.id)}
                        >
                          {isBusy ? (
                            <Loader2 className="mr-1 size-4 animate-spin" />
                          ) : null}
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setEditForm(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : null}
                    {canOpen ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => void handleAction(cat.id, "open")}
                      >
                        Open Category Voting
                      </Button>
                    ) : null}
                    {canClose ? (
                      <Button
                        type="button"
                        size="sm"
                        className={CLOSE_VOTING_BUTTON_CLASS}
                        disabled={isBusy}
                        onClick={() => void handleAction(cat.id, "close")}
                      >
                        Close Category Voting
                      </Button>
                    ) : null}
                    {canFinalize ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={isBusy}
                        onClick={() => void handleAction(cat.id, "finalize")}
                      >
                        Finalize
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void loadResults(cat.id)}
                    >
                      {resultsOpenId === cat.id ? (
                        <ChevronUp className="mr-1 size-4" />
                      ) : (
                        <ChevronDown className="mr-1 size-4" />
                      )}
                      Results
                    </Button>
                  </div>

                  {resultsOpenId === cat.id ? (
                    <div className="rounded-md border bg-muted/20 p-3">
                      {resultsLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="size-4 animate-spin" />
                          Loading results…
                        </div>
                      ) : (
                        <ResultsTable rows={results} />
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
