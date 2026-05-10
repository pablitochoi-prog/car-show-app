"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MasterAward = { id: string; name: string };
type EventAwardRow = {
  id: string;
  specialAwardId: string | null;
  name: string;
  isCustom: boolean;
};
type EventCategoryRow = {
  id: string;
  name: string;
  trophyCount: number;
};

const PLACE_LABELS = [
  "1st Place",
  "2nd Place",
  "3rd Place",
  "4th Place",
  "5th Place",
  "6th Place",
  "7th Place",
  "8th Place",
  "9th Place",
  "10th Place",
];

export function EventAwardsSection({ eventId }: { eventId: string }) {
  const [masterList, setMasterList] = useState<MasterAward[]>([]);
  const [eventAwards, setEventAwards] = useState<EventAwardRow[]>([]);
  const [eventCategories, setEventCategories] = useState<EventCategoryRow[]>([]);
  const [selectedAwardId, setSelectedAwardId] = useState("");
  const [customName, setCustomName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    const [awardsRes, catsRes, masterRes] = await Promise.all([
      fetch(`/api/events/${eventId}/awards`, { credentials: "same-origin" }),
      fetch(`/api/events/${eventId}/categories`, { credentials: "same-origin" }),
      fetch("/api/awards", { credentials: "same-origin" }),
    ]);
    const awardsData = (await awardsRes.json()) as { awards?: EventAwardRow[] };
    const catsData = (await catsRes.json()) as { categories?: EventCategoryRow[] };
    const masterData = (await masterRes.json()) as { awards?: MasterAward[] };
    setEventAwards(awardsData.awards ?? []);
    setEventCategories(catsData.categories ?? []);
    setMasterList(masterData.awards ?? []);
  }, [eventId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const addedAwardIds = new Set(
    eventAwards.filter((a) => a.specialAwardId).map((a) => a.specialAwardId),
  );
  const availableAwards = masterList.filter((a) => !addedAwardIds.has(a.id));

  // Derive category-based place awards
  const derivedAwards: string[] = [];
  for (const cat of eventCategories) {
    for (let i = 0; i < cat.trophyCount && i < PLACE_LABELS.length; i++) {
      derivedAwards.push(`Best ${cat.name} — ${PLACE_LABELS[i]}`);
    }
  }

  async function handleAddAward() {
    setBusy(true);
    setError("");
    try {
      const body: Record<string, string> = {};
      if (selectedAwardId) {
        body.specialAwardId = selectedAwardId;
      } else if (customName.trim()) {
        body.customName = customName.trim();
      } else {
        setError("Select an award or enter a custom name.");
        return;
      }

      const res = await fetch(`/api/events/${eventId}/awards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { awards?: EventAwardRow[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not add award.");
        return;
      }
      setEventAwards(data.awards ?? []);
      setSelectedAwardId("");
      setCustomName("");
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(eaId: string) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/awards?eventAwardId=${eaId}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      const data = (await res.json()) as { awards?: EventAwardRow[] };
      if (data.awards) setEventAwards(data.awards);
    } finally {
      setBusy(false);
    }
  }

  const selectClass =
    "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

  return (
    <div className="space-y-6">
      {/* Category-derived place awards (read-only) */}
      {derivedAwards.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Category Place Awards</p>
          <p className="text-xs text-muted-foreground">
            Auto-generated from your registration categories and trophy counts.
          </p>
          <ul className="divide-y rounded-md border bg-muted/20">
            {derivedAwards.map((label) => (
              <li
                key={label}
                className="flex items-center gap-2 px-4 py-2 text-sm"
              >
                <Trophy className="size-3.5 text-amber-500" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Special / custom awards */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Special Awards</p>
        {eventAwards.length > 0 && (
          <ul className="divide-y rounded-md border">
            {eventAwards.map((ea) => (
              <li
                key={ea.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Trophy className="size-3.5 text-amber-500" />
                  <span className="font-medium">{ea.name}</span>
                  {ea.isCustom && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      Custom
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:bg-destructive/10"
                  disabled={busy}
                  onClick={() => handleRemove(ea.id)}
                  aria-label={`Remove ${ea.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* `div` not `form` — may render inside the main event edit <form>. */}
      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium">Add a special award</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label className="text-xs">Select from list</Label>
            <select
              className={selectClass}
              value={selectedAwardId}
              onChange={(e) => {
                setSelectedAwardId(e.target.value);
                if (e.target.value) setCustomName("");
              }}
              disabled={busy}
            >
              <option value="">— Choose award —</option>
              {availableAwards.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" size="sm" disabled={busy} className="gap-1.5">
              <Plus className="size-4" />
              Add
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>or</span>
          <Input
            placeholder="Custom award name"
            value={customName}
            onChange={(e) => {
              setCustomName(e.target.value);
              if (e.target.value) setSelectedAwardId("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleAddAward();
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
              onClick={() => void handleAddAward()}
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
