"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EventMultiPickList,
  type PickListOption,
} from "@/components/forms/event-multi-pick-list";
import { EventSectionEditToolbar } from "@/components/forms/event-section-edit-toolbar";
import {
  EVENT_CATEGORIES_CHANGED,
  notifyEventCategoriesChanged,
} from "@/lib/event-awards-trophies";

type MasterCategory = { id: string; name: string; groupName: string | null };
type EventCategoryRow = {
  id: string;
  categoryId: string | null;
  name: string;
  trophyCount: number;
  isCustom: boolean;
};

export function EventCategoriesSection({
  eventId,
  onCountChange,
}: {
  eventId: string;
  onCountChange?: (count: number) => void;
}) {
  const [availableCategories, setAvailableCategories] = useState<
    MasterCategory[]
  >([]);
  const [masterCategoryCount, setMasterCategoryCount] = useState<number | null>(
    null,
  );
  const [eventCategories, setEventCategories] = useState<EventCategoryRow[]>([]);
  const [customName, setCustomName] = useState("");
  const [trophyCount, setTrophyCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const fetchEventCategories = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/categories`, {
      credentials: "same-origin",
    });
    const data = (await res.json()) as { categories?: EventCategoryRow[] };
    setEventCategories(data.categories ?? []);
  }, [eventId]);

  const loadAvailableCategories = useCallback(async () => {
    const res = await fetch(
      `/api/events/${eventId}/available-categories`,
      { credentials: "same-origin" },
    );
    const data = (await res.json()) as {
      categories?: MasterCategory[];
      masterCount?: number;
      error?: string;
    };
    if (!res.ok) {
      setAvailableCategories([]);
      setMasterCategoryCount(data.masterCount ?? null);
      setError(
        data.error ??
          "Could not load vehicle classes from Site Admin. Try again or refresh the page.",
      );
      return;
    }
    setAvailableCategories(data.categories ?? []);
    setMasterCategoryCount(data.masterCount ?? 0);
  }, [eventId]);

  useEffect(() => {
    void fetchEventCategories();
    void loadAvailableCategories();
  }, [fetchEventCategories, loadAvailableCategories]);

  useEffect(() => {
    function onCategoriesChanged(e: Event) {
      const detail = (e as CustomEvent<{ eventId?: string }>).detail;
      if (detail?.eventId === eventId) void fetchEventCategories();
    }
    window.addEventListener(EVENT_CATEGORIES_CHANGED, onCategoriesChanged);
    return () =>
      window.removeEventListener(EVENT_CATEGORIES_CHANGED, onCategoriesChanged);
  }, [eventId, fetchEventCategories]);

  useEffect(() => {
    if (editing) void loadAvailableCategories();
  }, [editing, loadAvailableCategories]);

  useEffect(() => {
    onCountChange?.(eventCategories.length);
  }, [eventCategories.length, onCountChange]);

  const pickOptions: PickListOption[] = availableCategories.map((c) => ({
    id: c.id,
    label: c.name,
    group: c.groupName,
  }));

  const emptyPickMessage =
    masterCategoryCount === 0
      ? "No vehicle classes exist in Site Admin → Vehicle Classifications yet. Add classes there first, then return here to attach them to this event."
      : pickOptions.length === 0
        ? "All vehicle classes from Site Admin are already on this event."
        : undefined;

  async function handleAddSelected(categoryIds: string[]) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ categoryIds, trophyCount }),
      });
      const data = (await res.json()) as {
        categories?: EventCategoryRow[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not add categories.");
        return;
      }
      setEventCategories(data.categories ?? []);
      notifyEventCategoriesChanged(eventId);
      await loadAvailableCategories();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveSelected(eventCategoryIds: string[]) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/categories`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ eventCategoryIds }),
      });
      const data = (await res.json()) as { categories?: EventCategoryRow[] };
      if (data.categories) setEventCategories(data.categories);
      notifyEventCategoriesChanged(eventId);
      await loadAvailableCategories();
    } finally {
      setBusy(false);
    }
  }

  async function handleAddCustom() {
    if (!customName.trim()) {
      setError("Enter a custom category name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ customName: customName.trim(), trophyCount }),
      });
      const data = (await res.json()) as {
        categories?: EventCategoryRow[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not add category.");
        return;
      }
      setEventCategories(data.categories ?? []);
      setCustomName("");
      setTrophyCount(1);
      notifyEventCategoriesChanged(eventId);
      await loadAvailableCategories();
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
    if (data.categories) {
      setEventCategories(data.categories);
      notifyEventCategoriesChanged(eventId);
    }
  }

  return (
    <div className="space-y-4">
      <EventSectionEditToolbar
        editing={editing}
        busy={busy}
        onStartEdit={() => {
          setEditing(true);
          setError("");
          void loadAvailableCategories();
        }}
        onDone={() => {
          setEditing(false);
          setError("");
          setCustomName("");
        }}
      />

      <EventMultiPickList
        availableLabel="Available categories"
        addPanelTitle="Add registration categories"
        emptyListMessage="No registration categories yet."
        options={pickOptions}
        emptyOptionsMessage={emptyPickMessage}
        busy={busy}
        readOnly={!editing}
        rows={eventCategories.map((ec) => ({
          id: ec.id,
          isCustom: ec.isCustom,
          label: (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-medium">{ec.name}</span>
                {ec.isCustom ? (
                  <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    Custom
                  </span>
                ) : null}
              </div>
              {editing ? (
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor={`tc-${ec.id}`}
                    className="text-xs whitespace-nowrap text-muted-foreground"
                    title="Place trophies for this category appear under Awards & Trophies"
                  >
                    Place trophies:
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
                    disabled={busy}
                  />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {ec.trophyCount} place{" "}
                  {ec.trophyCount === 1 ? "trophy" : "trophies"}
                </span>
              )}
            </div>
          ),
        }))}
        addExtras={
          editing ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Place trophies per category (for new adds)
              </Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={trophyCount}
                onChange={(e) =>
                  setTrophyCount(Number.parseInt(e.target.value, 10) || 1)
                }
                className="h-9 w-20 text-center tabular-nums"
                disabled={busy}
              />
            </div>
          </div>
          ) : null
        }
        onAddSelected={handleAddSelected}
        onRemoveSelected={handleRemoveSelected}
      />

      {editing ? (
      <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span>or add a custom category:</span>
        <Input
          placeholder="Custom category name"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleAddCustom();
            }
          }}
          className="h-8 max-w-xs text-sm"
          disabled={busy}
        />
        {customName.trim() ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            className="gap-1.5"
            onClick={() => void handleAddCustom()}
          >
            <Plus className="size-3.5" />
            Add custom
          </Button>
        ) : null}
      </div>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
