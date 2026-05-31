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
import { TrophyCountStepper } from "@/components/forms/trophy-count-stepper";
import {
  EVENT_CATEGORIES_CHANGED,
  notifyEventCategoriesChanged,
} from "@/lib/event-awards-trophies";
import {
  setEventCategoriesCache,
  useEventAvailableCategories,
  useEventCategories,
  type EventCategoryRow,
} from "@/hooks/use-event-setup-cache";

export function EventCategoriesSection({
  eventId,
  onCountChange,
}: {
  eventId: string;
  onCountChange?: (count: number) => void;
}) {
  const [customName, setCustomName] = useState("");
  const [trophyCount, setTrophyCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const { data: categoriesData, mutate: mutateCategories } =
    useEventCategories(eventId);
  const { data: availableData, mutate: mutateAvailable } =
    useEventAvailableCategories(eventId, editing);

  const eventCategories = categoriesData?.categories ?? [];
  const availableCategories = availableData?.categories ?? [];
  const masterCategoryCount = availableData?.masterCount ?? null;

  useEffect(() => {
    function onCategoriesChanged(e: Event) {
      const detail = (e as CustomEvent<{ eventId?: string }>).detail;
      if (detail?.eventId === eventId) void mutateCategories();
    }
    window.addEventListener(EVENT_CATEGORIES_CHANGED, onCategoriesChanged);
    return () =>
      window.removeEventListener(EVENT_CATEGORIES_CHANGED, onCategoriesChanged);
  }, [eventId, mutateCategories]);

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

  useEffect(() => {
    onCountChange?.(eventCategories.length);
  }, [eventCategories.length, onCountChange]);

  async function applyCategoriesResponse(
    categories: EventCategoryRow[],
    options?: { refreshAvailable?: boolean },
  ) {
    await setEventCategoriesCache(eventId, categories);
    notifyEventCategoriesChanged(eventId);
    if (options?.refreshAvailable !== false && editing) {
      await mutateAvailable();
    }
  }

  const patchTrophyCountLocally = useCallback(
    (ecId: string, count: number) => {
      const next = eventCategories.map((ec) =>
        ec.id === ecId ? { ...ec, trophyCount: count } : ec,
      );
      void setEventCategoriesCache(eventId, next);
    },
    [eventCategories, eventId],
  );

  const persistTrophyCount = useCallback(
    async (ecId: string, count: number) => {
      const res = await fetch(`/api/events/${eventId}/categories`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ eventCategoryId: ecId, trophyCount: count }),
      });
      const data = (await res.json()) as {
        categories?: EventCategoryRow[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not save trophy count.");
      }
      if (data.categories) {
        await setEventCategoriesCache(eventId, data.categories);
      }
    },
    [eventId],
  );

  const handleTrophySave = useCallback(
    async (ecId: string, count: number) => {
      try {
        setError("");
        await persistTrophyCount(ecId, count);
      } catch {
        setError("Could not save trophy count. Restored previous value.");
        await mutateCategories();
        throw new Error("save failed");
      }
    },
    [mutateCategories, persistTrophyCount],
  );

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
      await applyCategoriesResponse(data.categories ?? []);
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
      if (data.categories) await applyCategoriesResponse(data.categories);
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
      setCustomName("");
      setTrophyCount(1);
      await applyCategoriesResponse(data.categories ?? []);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
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
                  <TrophyCountStepper
                    id={`tc-${ec.id}`}
                    value={ec.trophyCount}
                    disabled={busy}
                    aria-label={`Place trophies for ${ec.name}`}
                    onChange={(count) => patchTrophyCountLocally(ec.id, count)}
                    onSave={(count) => handleTrophySave(ec.id, count)}
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
