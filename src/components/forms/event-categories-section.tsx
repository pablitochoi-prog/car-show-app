"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MasterCategory = { id: string; name: string; groupName: string | null };
type EventCategoryRow = {
  id: string;
  categoryId: string | null;
  name: string;
  trophyCount: number;
  isCustom: boolean;
};

export function EventCategoriesSection({ eventId }: { eventId: string }) {
  const [masterList, setMasterList] = useState<MasterCategory[]>([]);
  const [eventCategories, setEventCategories] = useState<EventCategoryRow[]>([]);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [customName, setCustomName] = useState("");
  const [trophyCount, setTrophyCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fetchEventCategories = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/categories`, {
      credentials: "same-origin",
    });
    const data = (await res.json()) as { categories?: EventCategoryRow[] };
    setEventCategories(data.categories ?? []);
  }, [eventId]);

  useEffect(() => {
    void fetch("/api/categories", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d: { categories?: MasterCategory[] }) =>
        setMasterList(d.categories ?? []),
      );
    void fetchEventCategories();
  }, [fetchEventCategories]);

  const addedCategoryIds = new Set(
    eventCategories.filter((c) => c.categoryId).map((c) => c.categoryId),
  );
  const availableCategories = masterList.filter((c) => !addedCategoryIds.has(c.id));

  async function handleAddCategory() {
    setBusy(true);
    setError("");
    try {
      const body: Record<string, unknown> = { trophyCount };
      if (selectedCatId) {
        body.categoryId = selectedCatId;
      } else if (customName.trim()) {
        body.customName = customName.trim();
      } else {
        setError("Select a category or enter a custom name.");
        return;
      }

      const res = await fetch(`/api/events/${eventId}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { categories?: EventCategoryRow[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not add category.");
        return;
      }
      setEventCategories(data.categories ?? []);
      setSelectedCatId("");
      setCustomName("");
      setTrophyCount(1);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateTrophyCount(ecId: string, count: number) {
    const res = await fetch(`/api/events/${eventId}/categories`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ eventCategoryId: ecId, trophyCount: count }),
    });
    const data = (await res.json()) as { categories?: EventCategoryRow[] };
    if (data.categories) setEventCategories(data.categories);
  }

  async function handleRemove(ecId: string) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/categories?eventCategoryId=${ecId}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      const data = (await res.json()) as { categories?: EventCategoryRow[] };
      if (data.categories) setEventCategories(data.categories);
    } finally {
      setBusy(false);
    }
  }

  const selectClass =
    "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

  return (
    <div className="space-y-4">
      {/* Current event categories */}
      {eventCategories.length > 0 && (
        <ul className="divide-y rounded-md border">
          {eventCategories.map((ec) => (
            <li
              key={ec.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{ec.name}</span>
                {ec.isCustom && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    Custom
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`tc-${ec.id}`} className="text-xs text-muted-foreground whitespace-nowrap">
                  Awards:
                </Label>
                <Input
                  id={`tc-${ec.id}`}
                  type="number"
                  min={1}
                  max={20}
                  value={ec.trophyCount}
                  onChange={(e) => {
                    const val = Number.parseInt(e.target.value, 10);
                    if (Number.isFinite(val) && val >= 1 && val <= 20) {
                      void handleUpdateTrophyCount(ec.id, val);
                    }
                  }}
                  className="h-8 w-16 text-center tabular-nums"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:bg-destructive/10"
                  disabled={busy}
                  onClick={() => handleRemove(ec.id)}
                  aria-label={`Remove ${ec.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* `div` not `form` — may render inside the main event edit <form>. */}
      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium">Add a registration category</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="space-y-1.5">
            <Label className="text-xs">Select from list</Label>
            <select
              className={selectClass}
              value={selectedCatId}
              onChange={(e) => {
                setSelectedCatId(e.target.value);
                if (e.target.value) setCustomName("");
              }}
              disabled={busy}
            >
              <option value="">— Choose category —</option>
              {(() => {
                const grouped = new Map<string, MasterCategory[]>();
                const ungrouped: MasterCategory[] = [];
                for (const c of availableCategories) {
                  if (c.groupName) {
                    const list = grouped.get(c.groupName) ?? [];
                    list.push(c);
                    grouped.set(c.groupName, list);
                  } else {
                    ungrouped.push(c);
                  }
                }
                return (
                  <>
                    {[...grouped.entries()].map(([group, cats]) => (
                      <optgroup key={group} label={group}>
                        {cats.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </optgroup>
                    ))}
                    {ungrouped.length > 0 && (
                      <optgroup label="Other">
                        {ungrouped.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </>
                );
              })()}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Awards</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={trophyCount}
              onChange={(e) => setTrophyCount(Number.parseInt(e.target.value, 10) || 1)}
              className="h-9 w-20 text-center tabular-nums"
              disabled={busy}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              size="sm"
              disabled={busy}
              className="gap-1.5"
              onClick={() => void handleAddCategory()}
            >
              <Plus className="size-4" />
              Add
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>or</span>
          <Input
            placeholder="Custom category name"
            value={customName}
            onChange={(e) => {
              setCustomName(e.target.value);
              if (e.target.value) setSelectedCatId("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleAddCategory();
              }
            }}
            className="h-8 max-w-xs text-sm"
            disabled={busy}
          />
          {customName.trim() && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              className="gap-1.5"
              onClick={() => void handleAddCategory()}
            >
              <Plus className="size-3.5" />
              Add Custom
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
