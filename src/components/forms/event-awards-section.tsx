"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EventMultiPickList,
  type PickListOption,
} from "@/components/forms/event-multi-pick-list";
import { EventSectionEditToolbar } from "@/components/forms/event-section-edit-toolbar";
import {
  EVENT_CATEGORIES_CHANGED,
  buildEventAwardTrophyEntries,
  notifyEventCategoriesChanged,
} from "@/lib/event-awards-trophies";
import {
  setEventAwardsCache,
  setEventCategoriesCache,
  useEventAwards,
  useEventCategories,
  useMasterAwards,
  type EventAwardRow,
  type EventCategoryRow,
} from "@/hooks/use-event-setup-cache";

type MasterAward = { id: string; name: string };

export function EventAwardsSection({
  eventId,
  onCountChange,
}: {
  eventId: string;
  onCountChange?: (count: number) => void;
}) {
  const [customName, setCustomName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const { data: awardsData } = useEventAwards(eventId);
  const { data: categoriesData, mutate: mutateCategories } =
    useEventCategories(eventId);
  const { data: masterData } = useMasterAwards();

  const eventAwards =
    (awardsData as { awards?: EventAwardRow[] } | undefined)?.awards ?? [];
  const eventCategories = categoriesData?.categories ?? [];
  const masterList =
    (masterData as { awards?: MasterAward[] } | undefined)?.awards ?? [];

  useEffect(() => {
    function onCategoriesChanged(e: Event) {
      const detail = (e as CustomEvent<{ eventId?: string }>).detail;
      if (detail?.eventId === eventId) void mutateCategories();
    }
    window.addEventListener(EVENT_CATEGORIES_CHANGED, onCategoriesChanged);
    return () =>
      window.removeEventListener(EVENT_CATEGORIES_CHANGED, onCategoriesChanged);
  }, [eventId, mutateCategories]);

  const trophyEntries = useMemo(
    () =>
      buildEventAwardTrophyEntries({
        categories: eventCategories,
        specialAwards: eventAwards.map((a) => ({ id: a.id, name: a.name })),
      }),
    [eventCategories, eventAwards],
  );

  useEffect(() => {
    onCountChange?.(trophyEntries.length);
  }, [trophyEntries.length, onCountChange]);

  const addedAwardIds = new Set(
    eventAwards.filter((a) => a.specialAwardId).map((a) => a.specialAwardId),
  );
  const pickOptions: PickListOption[] = masterList
    .filter((a) => !addedAwardIds.has(a.id))
    .map((a) => ({ id: a.id, label: a.name }));

  async function handleAddSelected(specialAwardIds: string[]) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/awards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ specialAwardIds }),
      });
      const data = (await res.json()) as { awards?: EventAwardRow[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not add awards.");
        return;
      }
      await setEventAwardsCache(eventId, data.awards ?? []);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveSelected(entryIds: string[]) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/awards-trophies`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ entryIds }),
      });
      const data = (await res.json()) as {
        categories?: EventCategoryRow[];
        awards?: EventAwardRow[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not remove awards.");
        return;
      }
      if (data.categories) await setEventCategoriesCache(eventId, data.categories);
      if (data.awards) await setEventAwardsCache(eventId, data.awards);
      notifyEventCategoriesChanged(eventId);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddCustom() {
    if (!customName.trim()) {
      setError("Enter a custom award name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/awards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ customName: customName.trim() }),
      });
      const data = (await res.json()) as { awards?: EventAwardRow[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not add award.");
        return;
      }
      await setEventAwardsCache(eventId, data.awards ?? []);
      setCustomName("");
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
        onStartEdit={() => setEditing(true)}
        onDone={() => {
          setEditing(false);
          setError("");
          setCustomName("");
        }}
      />

      {editing ? (
        <p className="text-xs text-muted-foreground">
          All trophies for this event — category place awards and special awards.
          Removing a category place trophy lowers that category&apos;s award count
          on the Registration Categories list.
        </p>
      ) : null}

      <EventMultiPickList
        availableLabel="Available special awards"
        addPanelTitle="Add special awards to the list"
        emptyListMessage="No awards or trophies yet. Add registration categories (with place awards) or special awards below."
        options={pickOptions}
        busy={busy}
        readOnly={!editing}
        rows={trophyEntries.map((entry) => ({
          id: entry.id,
          label: (
            <div className="flex flex-wrap items-center gap-2">
              <Trophy className="size-3.5 shrink-0 text-amber-500" />
              <span className="font-medium">{entry.label}</span>
              {entry.kind === "category_place" ? (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  Category place
                </span>
              ) : (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  Special
                </span>
              )}
            </div>
          ),
        }))}
        onAddSelected={handleAddSelected}
        onRemoveSelected={handleRemoveSelected}
      />

      {editing ? (
      <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span>or add a custom special award:</span>
        <Input
          placeholder="Custom award name"
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
