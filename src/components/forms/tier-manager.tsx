"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatetimeLocalField } from "@/components/inputs/datetime-local-field";
import { GripVertical, Loader2, Pencil, Trash2, Check, X, Plus } from "lucide-react";

export type TierRow = {
  id: string;
  name: string;
  priceCents: number;
  opensAt: string | null;
  closesAt: string | null;
  memberOnly: boolean;
  sortOrder: number;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function toTierIso(local: string): string | null {
  if (!local.trim()) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function tierDatePayload(
  useTimeWindow: boolean,
  opensAt: string,
  closesAt: string,
): { opensAt: string | null; closesAt: string | null } | { error: string } {
  if (!useTimeWindow) {
    return { opensAt: null, closesAt: null };
  }
  const openIso = opensAt.trim() ? toTierIso(opensAt) : null;
  const closeIso = closesAt.trim() ? toTierIso(closesAt) : null;
  if (opensAt.trim() && !openIso) {
    return { error: "Enter a valid start date and time." };
  }
  if (closesAt.trim() && !closeIso) {
    return { error: "Enter a valid end date and time." };
  }
  return { opensAt: openIso, closesAt: closeIso };
}

function toLocalDatetime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const CUSTOM_TIER_VALUE = "__CUSTOM__";

function TierFields({
  name, setName,
  priceDollars, setPriceDollars,
  useTimeWindow, setUseTimeWindow,
  opensAt, setOpensAt,
  closesAt, setClosesAt,
  templateNames,
  fieldsRequired = false,
}: {
  name: string; setName: (v: string) => void;
  priceDollars: string; setPriceDollars: (v: string) => void;
  useTimeWindow: boolean; setUseTimeWindow: (v: boolean) => void;
  opensAt: string; setOpensAt: (v: string) => void;
  closesAt: string; setClosesAt: (v: string) => void;
  templateNames: string[];
  fieldsRequired?: boolean;
}) {
  const fieldIdPrefix = useId();
  const isCustom = name !== "" && !templateNames.includes(name);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Registration Tier</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none sm:h-11"
            value={isCustom ? CUSTOM_TIER_VALUE : name}
            onChange={(e) => {
              const v = e.target.value;
              if (v === CUSTOM_TIER_VALUE) setName("");
              else setName(v);
            }}
            required={fieldsRequired && !isCustom}
          >
            <option value="">— Select tier —</option>
            {templateNames.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
            <option value={CUSTOM_TIER_VALUE}>Custom…</option>
          </select>
          {isCustom && (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter custom tier name"
              required={fieldsRequired}
            />
          )}
        </div>
        <div className="space-y-2">
          <Label>Price (USD)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={priceDollars}
            onChange={(e) => setPriceDollars(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={useTimeWindow}
          onChange={(e) => setUseTimeWindow(e.target.checked)}
          className="h-4 w-4 rounded border border-input"
        />
        <Label className="leading-snug">
          Enable Start/End Date for this Registration Tier?
          <span className="block text-xs font-normal text-muted-foreground">
            e.g., Early Bird Window, etc.
          </span>
        </Label>
      </div>
      {useTimeWindow && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${fieldIdPrefix}-opens`}>Start Date</Label>
            <DatetimeLocalField
              id={`${fieldIdPrefix}-opens`}
              aria-label="Registration tier start date"
              value={opensAt}
              onChange={setOpensAt}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${fieldIdPrefix}-closes`}>End Date</Label>
            <DatetimeLocalField
              id={`${fieldIdPrefix}-closes`}
              aria-label="Registration tier end date"
              value={closesAt}
              onChange={setClosesAt}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function TierManager({
  eventId,
  initialTiers,
}: {
  eventId: string;
  initialTiers: TierRow[];
}) {
  const [tiers, setTiers] = useState<TierRow[]>(initialTiers);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [templateNames, setTemplateNames] = useState<string[]>([]);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [priceDollars, setPriceDollars] = useState("0");
  const [useTimeWindow, setUseTimeWindow] = useState(false);
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPriceDollars, setEditPriceDollars] = useState("0");
  const [editUseTimeWindow, setEditUseTimeWindow] = useState(false);
  const [editOpensAt, setEditOpensAt] = useState("");
  const [editClosesAt, setEditClosesAt] = useState("");

  // Drag state
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/tier-templates", { credentials: "same-origin" });
      if (res.ok) {
        const data = (await res.json()) as { names: string[] };
        setTemplateNames(data.names ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void loadTemplates(); }, [loadTemplates]);

  async function refreshTiers() {
    const res = await fetch(`/api/events/${eventId}/tiers`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not refresh tiers");
      return;
    }
    setTiers(data.tiers ?? []);
    setError("");
  }

  async function persistOrder(reordered: TierRow[]) {
    setTiers(reordered);
    await fetch(`/api/events/${eventId}/tiers`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((t) => t.id) }),
    });
  }

  function handleDragStart(idx: number) {
    dragIdx.current = idx;
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOverIdx(idx);
  }

  function handleDrop(idx: number) {
    const from = dragIdx.current;
    if (from == null || from === idx) {
      dragIdx.current = null;
      setDragOverIdx(null);
      return;
    }
    const updated = [...tiers];
    const [moved] = updated.splice(from, 1);
    updated.splice(idx, 0, moved);
    dragIdx.current = null;
    setDragOverIdx(null);
    void persistOrder(updated);
  }

  function handleDragEnd() {
    dragIdx.current = null;
    setDragOverIdx(null);
  }

  function resetAddForm() {
    setName("");
    setPriceDollars("0");
    setUseTimeWindow(false);
    setOpensAt("");
    setClosesAt("");
    setShowAddForm(false);
    setError("");
  }

  async function addTier() {
    if (!name.trim()) {
      setError("Select or enter a tier name");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const dollars = parseFloat(priceDollars);
      if (Number.isNaN(dollars) || dollars < 0) {
        setError("Enter a valid price");
        return;
      }
      const priceCents = Math.round(dollars * 100);
      const dates = tierDatePayload(useTimeWindow, opensAt, closesAt);
      if ("error" in dates) {
        setError(dates.error);
        return;
      }
      const res = await fetch(`/api/events/${eventId}/tiers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          priceCents,
          opensAt: dates.opensAt,
          closesAt: dates.closesAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create tier");
        return;
      }
      resetAddForm();
      await refreshTiers();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(t: TierRow) {
    setEditId(t.id);
    setEditName(t.name);
    setEditPriceDollars((t.priceCents / 100).toString());
    const hasWindow = t.opensAt != null || t.closesAt != null;
    setEditUseTimeWindow(hasWindow);
    setEditOpensAt(toLocalDatetime(t.opensAt));
    setEditClosesAt(toLocalDatetime(t.closesAt));
  }

  function cancelEdit() {
    setEditId(null);
  }

  async function saveEdit(tierId: string) {
    setSaving(true);
    setError("");
    try {
      const dollars = parseFloat(editPriceDollars);
      if (Number.isNaN(dollars) || dollars < 0) {
        setError("Enter a valid price");
        return;
      }
      const priceCents = Math.round(dollars * 100);
      const dates = tierDatePayload(editUseTimeWindow, editOpensAt, editClosesAt);
      if ("error" in dates) {
        setError(dates.error);
        return;
      }
      const res = await fetch(`/api/events/${eventId}/tiers/${tierId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          priceCents,
          opensAt: dates.opensAt,
          closesAt: dates.closesAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update tier");
        return;
      }
      setEditId(null);
      await refreshTiers();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function removeTier(id: string) {
    if (!confirm("Delete this tier?")) return;
    setError("");
    const res = await fetch(`/api/events/${eventId}/tiers/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not delete");
      return;
    }
    await refreshTiers();
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Existing tiers */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">
          Existing tiers{" "}
          <span className="text-muted-foreground font-normal">
            ({tiers.length})
          </span>
        </h4>
        <p className="text-xs text-muted-foreground">
          Drag the handle to reorder. Click the pencil to edit.
        </p>
        {tiers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No tiers yet. Add one below.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {tiers.map((t, idx) =>
              editId === t.id ? (
                <li key={t.id} className="px-4 py-3 space-y-3 bg-muted/20">
                  <TierFields
                    name={editName} setName={setEditName}
                    priceDollars={editPriceDollars} setPriceDollars={setEditPriceDollars}
                    useTimeWindow={editUseTimeWindow} setUseTimeWindow={setEditUseTimeWindow}
                    opensAt={editOpensAt} setOpensAt={setEditOpensAt}
                    closesAt={editClosesAt} setClosesAt={setEditClosesAt}
                    templateNames={templateNames}
                    fieldsRequired
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving}
                      onClick={() => void saveEdit(t.id)}
                      className="gap-1.5"
                    >
                      <Check className="size-3.5" />
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={cancelEdit}
                      className="gap-1.5"
                    >
                      <X className="size-3.5" />
                      Cancel
                    </Button>
                  </div>
                </li>
              ) : (
                <li
                  key={t.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                    dragOverIdx === idx ? "bg-primary/5" : ""
                  }`}
                >
                  <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
                  <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-medium">{t.name}</span>
                      <span className="text-muted-foreground">
                        {" "}— {formatMoney(t.priceCents)}
                      </span>
                      {(t.opensAt || t.closesAt) && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {t.opensAt && `Starts ${new Date(t.opensAt).toLocaleDateString()}`}
                          {t.opensAt && t.closesAt && " · "}
                          {t.closesAt && `Ends ${new Date(t.closesAt).toLocaleDateString()}`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => startEdit(t)}
                        aria-label={`Edit ${t.name}`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:bg-destructive/10"
                        onClick={() => removeTier(t.id)}
                        aria-label={`Delete ${t.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      {/* Add tier */}
      {showAddForm ? (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <TierFields
            name={name} setName={setName}
            priceDollars={priceDollars} setPriceDollars={setPriceDollars}
            useTimeWindow={useTimeWindow} setUseTimeWindow={setUseTimeWindow}
            opensAt={opensAt} setOpensAt={setOpensAt}
            closesAt={closesAt} setClosesAt={setClosesAt}
            templateNames={templateNames}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={() => void addTier()}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={resetAddForm}
              className="gap-1.5"
            >
              <X className="size-3.5" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="size-4" />
          Add tier
        </Button>
      )}
    </div>
  );
}
