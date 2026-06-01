"use client";

import { useCallback, useEffect, useState } from "react";
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
  judgeGuidance: string | null;
  eligibleClasses: { eventCategoryId: string }[];
  judgeAssignments: { judgeUserId: string }[];
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

type CategoryFormState = {
  name: string;
  description: string;
  votesPerJudge: number;
  maxVotesPerJudgePerVehicle: number;
  judgeGuidance: string;
  eligibleEventCategoryIds: string[];
  assignedJudgeUserIds: string[];
};

function emptyForm(): CategoryFormState {
  return {
    name: "",
    description: "",
    votesPerJudge: 5,
    maxVotesPerJudgePerVehicle: 1,
    judgeGuidance: "",
    eligibleEventCategoryIds: [],
    assignedJudgeUserIds: [],
  };
}

function categoryToForm(
  cat: BallotCategory,
  vehicleClasses: VehicleClassOption[],
): CategoryFormState {
  return {
    name: cat.name,
    description: cat.description ?? "",
    votesPerJudge: cat.votesPerJudge,
    maxVotesPerJudgePerVehicle: cat.maxVotesPerJudgePerVehicle,
    judgeGuidance: cat.judgeGuidance ?? "",
    eligibleEventCategoryIds: cat.eligibleClasses.map((c) => c.eventCategoryId),
    assignedJudgeUserIds: cat.judgeAssignments.map((j) => j.judgeUserId),
  };
}

function MultiCheckboxList({
  options,
  selected,
  onChange,
  emptyMessage,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  emptyMessage?: string;
}) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {emptyMessage ?? "No options available."}
      </p>
    );
  }

  return (
    <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
      {options.map((opt) => {
        const checked = selected.includes(opt.id);
        return (
          <label
            key={opt.id}
            className="flex cursor-pointer items-center gap-2 text-sm"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => {
                onChange(
                  checked
                    ? selected.filter((id) => id !== opt.id)
                    : [...selected, opt.id],
                );
              }}
              className="size-4 rounded border"
            />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}

function CategoryFormFields({
  form,
  setForm,
  vehicleClasses,
  eventJudges,
  disabled,
}: {
  form: CategoryFormState;
  setForm: (f: CategoryFormState) => void;
  vehicleClasses: VehicleClassOption[];
  eventJudges: JudgeOption[];
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="award-name">Award Category Name</Label>
        <Input
          id="award-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Best Paint"
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="award-desc">Description (optional)</Label>
        <Input
          id="award-desc"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="votes-per-judge">Votes per Judge</Label>
          <Input
            id="votes-per-judge"
            type="number"
            min={1}
            value={form.votesPerJudge}
            onChange={(e) =>
              setForm({
                ...form,
                votesPerJudge: Math.max(1, parseInt(e.target.value, 10) || 1),
              })
            }
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max-per-vehicle">Max Votes per Vehicle (per judge)</Label>
          <Input
            id="max-per-vehicle"
            type="number"
            min={1}
            value={form.maxVotesPerJudgePerVehicle}
            onChange={(e) =>
              setForm({
                ...form,
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
      <div className="space-y-2">
        <Label htmlFor="judge-guidance">Judge Guidance (optional)</Label>
        <Textarea
          id="judge-guidance"
          value={form.judgeGuidance}
          onChange={(e) => setForm({ ...form, judgeGuidance: e.target.value })}
          rows={3}
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label>Eligible Vehicle Classes</Label>
        <p className="text-xs text-muted-foreground">
          Leave all unchecked to allow any registered vehicle. Select specific
          classes to restrict eligibility.
        </p>
        <MultiCheckboxList
          options={vehicleClasses}
          selected={form.eligibleEventCategoryIds}
          onChange={(ids) =>
            setForm({ ...form, eligibleEventCategoryIds: ids })
          }
          emptyMessage="Add vehicle classes on the event setup page first."
        />
      </div>
      <div className="space-y-2">
        <Label>Assigned Judges</Label>
        <p className="text-xs text-muted-foreground">
          Leave all unchecked to allow all event judges. Select specific judges
          to restrict this award category.
        </p>
        <MultiCheckboxList
          options={eventJudges.map((j) => ({
            id: j.userId,
            label: `${j.name} (${j.email})`,
          }))}
          selected={form.assignedJudgeUserIds}
          onChange={(ids) =>
            setForm({ ...form, assignedJudgeUserIds: ids })
          }
          emptyMessage="Assign judges on the event staff page first."
        />
      </div>
    </div>
  );
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
}: {
  eventId: string;
  vehicleClasses: VehicleClassOption[];
  eventJudges: JudgeOption[];
}) {
  const [categories, setCategories] = useState<BallotCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createForm, setCreateForm] = useState(emptyForm());
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CategoryFormState>(emptyForm());
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
    if (!createForm.name.trim()) {
      setError("Award category name is required.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/judge-ballot/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: createForm.name.trim(),
          description: createForm.description.trim() || undefined,
          votesPerJudge: createForm.votesPerJudge,
          maxVotesPerJudgePerVehicle: createForm.maxVotesPerJudgePerVehicle,
          judgeGuidance: createForm.judgeGuidance.trim() || undefined,
          eligibleEventCategoryIds:
            createForm.eligibleEventCategoryIds.length > 0
              ? createForm.eligibleEventCategoryIds
              : undefined,
          assignedJudgeUserIds:
            createForm.assignedJudgeUserIds.length > 0
              ? createForm.assignedJudgeUserIds
              : undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Create failed.");
      setCreateForm(emptyForm());
      setShowCreate(false);
      await loadCategories();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit(catId: string) {
    setBusyId(catId);
    setError("");
    try {
      const res = await fetch(
        `/api/events/${eventId}/judge-ballot/categories/${catId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            name: editForm.name.trim(),
            description: editForm.description.trim() || null,
            votesPerJudge: editForm.votesPerJudge,
            maxVotesPerJudgePerVehicle: editForm.maxVotesPerJudgePerVehicle,
            judgeGuidance: editForm.judgeGuidance.trim() || null,
            eligibleEventCategoryIds: editForm.eligibleEventCategoryIds,
            assignedJudgeUserIds: editForm.assignedJudgeUserIds,
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

  function classSummary(cat: BallotCategory): string {
    if (cat.eligibleClasses.length === 0) return "All vehicle classes";
    const labels = cat.eligibleClasses
      .map(
        (ec) =>
          vehicleClasses.find((vc) => vc.id === ec.eventCategoryId)?.label,
      )
      .filter(Boolean);
    return labels.length > 0 ? labels.join(", ") : `${cat.eligibleClasses.length} class(es)`;
  }

  function judgeSummary(cat: BallotCategory): string {
    if (cat.judgeAssignments.length === 0) return "All event judges";
    return `${cat.judgeAssignments.length} assigned judge(s)`;
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
            <CardTitle>Create Award Category</CardTitle>
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
            <CategoryFormFields
              form={createForm}
              setForm={setCreateForm}
              vehicleClasses={vehicleClasses}
              eventJudges={eventJudges}
            />
            <div className="flex gap-2">
              <Button onClick={() => void handleCreate()} disabled={creating}>
                {creating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                ) : null}
                Create Award Category
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreate(false);
                  setCreateForm(emptyForm());
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Click New to add a judge ballot award category such as Best Paint or Best in Show.
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
        <div className="space-y-4">
          {categories.map((cat) => {
            const isEditing = editingId === cat.id;
            const isBusy = busyId === cat.id;
            const canEdit = cat.status === "DRAFT";
            const canOpen =
              cat.status === "DRAFT" || cat.status === "CLOSED";
            const canClose = cat.status === "OPEN";
            const canFinalize =
              cat.status === "OPEN" || cat.status === "CLOSED";

            return (
              <Card key={cat.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle>{cat.name}</CardTitle>
                      <CardDescription className="mt-1 space-y-0.5">
                        <span className="block">
                          {cat.votesPerJudge} votes/judge · max{" "}
                          {cat.maxVotesPerJudgePerVehicle}/vehicle
                        </span>
                        <span className="block">Eligible: {classSummary(cat)}</span>
                        <span className="block">Judges: {judgeSummary(cat)}</span>
                        <span className="block">
                          {cat._count.votes} vote row(s) · {cat._count.allocations}{" "}
                          allocation(s)
                        </span>
                      </CardDescription>
                    </div>
                    <Badge variant={statusVariant(cat.status)}>
                      {STATUS_LABELS[cat.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <CategoryFormFields
                      form={editForm}
                      setForm={setEditForm}
                      vehicleClasses={vehicleClasses}
                      eventJudges={eventJudges}
                      disabled={isBusy}
                    />
                  ) : cat.judgeGuidance ? (
                    <p className="text-sm text-muted-foreground">
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
                          setEditForm(categoryToForm(cat, vehicleClasses));
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
                          onClick={() => setEditingId(null)}
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
                        Open Voting
                      </Button>
                    ) : null}
                    {canClose ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => void handleAction(cat.id, "close")}
                      >
                        Close
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
