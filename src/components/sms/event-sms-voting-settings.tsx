"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DatetimeLocalField,
  splitDatetimeLocal,
  zonedLocalToDatetimeLocal,
} from "@/components/inputs/datetime-local-field";
import { Loader2, MessageSquare } from "lucide-react";
import {
  utcInstantToZonedLocal,
  zonedLocalToUtcIso,
} from "@/lib/event-calendar";
import {
  defaultSmsVotingWindow,
  resolveEventScheduleTimeZone,
  type EventScheduleForSmsDefaults,
} from "@/lib/sms/default-voting-window";

type CategoryRow = {
  id?: string;
  name: string;
  smsOptionNumber: number;
  isActive: boolean;
  isCustom: boolean;
  maxVotesPerPhone: number;
};

type Props = {
  eventId: string;
  eventSchedule: EventScheduleForSmsDefaults;
  onStatusChange?: (status: "complete" | "not_enabled" | null) => void;
};

function resolveSmsVotingStatus(
  enabled: boolean,
  categories: CategoryRow[],
  context: "load" | "save",
  hasPersistedSchedule = false,
): "complete" | "not_enabled" | null {
  if (enabled && categories.some((c) => c.isActive)) {
    return "complete";
  }
  if (!enabled) {
    if (context === "save") return "not_enabled";
    if (categories.length > 0 || hasPersistedSchedule) return "not_enabled";
    return null;
  }
  return null;
}

export function EventSmsVotingSettings({
  eventId,
  eventSchedule,
  onStatusChange,
}: Props) {
  const eventTimeZone = useMemo(
    () => resolveEventScheduleTimeZone(eventSchedule),
    [eventSchedule],
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [smsVotingEnabled, setSmsVotingEnabled] = useState(false);
  const [smsVotingStartsAt, setSmsVotingStartsAt] = useState("");
  const [smsVotingEndsAt, setSmsVotingEndsAt] = useState("");
  const [smsNumber, setSmsNumber] = useState("");
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [smsPresets, setSmsPresets] = useState<string[]>([]);
  const [instructionPreview, setInstructionPreview] = useState("");
  const [customName, setCustomName] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const userEditedRef = useRef(false);
  const eventScheduleRef = useRef(eventSchedule);
  eventScheduleRef.current = eventSchedule;

  const syncStatus = useCallback(
    (
      enabled: boolean,
      cats: CategoryRow[],
      context: "load" | "save",
      hasPersistedSchedule = false,
    ) => {
      onStatusChange?.(
        resolveSmsVotingStatus(enabled, cats, context, hasPersistedSchedule),
      );
    },
    [onStatusChange],
  );

  function applyDefaultVotingTimes() {
    const defaults = defaultSmsVotingWindow(eventScheduleRef.current);
    setSmsVotingStartsAt(
      zonedLocalToDatetimeLocal(defaults.opens.date, defaults.opens.time),
    );
    setSmsVotingEndsAt(
      zonedLocalToDatetimeLocal(defaults.closes.date, defaults.closes.time),
    );
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/sms-voting`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");

      if (userEditedRef.current) return;

      const enabled = Boolean(data.smsVotingEnabled);
      const loadedCategories = (data.categories ?? []) as CategoryRow[];
      setSmsVotingEnabled(enabled);

      const opens = utcInstantToZonedLocal(
        data.smsVotingStartsAt,
        eventTimeZone,
      );
      const closes = utcInstantToZonedLocal(
        data.smsVotingEndsAt,
        eventTimeZone,
      );

      if (enabled && !opens.date && !closes.date) {
        applyDefaultVotingTimes();
      } else {
        setSmsVotingStartsAt(zonedLocalToDatetimeLocal(opens.date, opens.time));
        setSmsVotingEndsAt(zonedLocalToDatetimeLocal(closes.date, closes.time));
      }

      setSmsNumber(data.smsNumber ?? "");
      setSmsPresets(data.presets ?? []);
      setCategories(loadedCategories);
      setInstructionPreview(data.instructionPreview ?? "");
      syncStatus(
        enabled,
        loadedCategories,
        "load",
        Boolean(data.smsVotingStartsAt || data.smsVotingEndsAt),
      );
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load settings",
      });
    } finally {
      setLoading(false);
    }
  }, [eventId, eventTimeZone, syncStatus]);

  useEffect(() => {
    void load();
  }, [eventId, load]);

  function handleEnableChange(checked: boolean) {
    userEditedRef.current = true;
    setSmsVotingEnabled(checked);
    setMessage(null);
    if (checked) {
      applyDefaultVotingTimes();
    }
  }

  function togglePreset(name: string) {
    userEditedRef.current = true;
    setCategories((prev) => {
      const existing = prev.find((c) => c.name === name && !c.isCustom);
      if (existing) {
        return prev.filter((c) => c !== existing);
      }
      if (prev.length >= 3) return prev;
      const used = new Set(prev.map((c) => c.smsOptionNumber));
      let num = 1;
      while (used.has(num) && num <= 3) num++;
      if (num > 3) return prev;
      return [
        ...prev,
        {
          name,
          smsOptionNumber: num,
          isActive: true,
          isCustom: false,
          maxVotesPerPhone: 1,
        },
      ];
    });
  }

  function addCustomCategory() {
    userEditedRef.current = true;
    const name = customName.trim();
    if (!name) return;
    if (categories.length >= 3) return;
    if (categories.some((c) => c.isCustom)) return;
    const used = new Set(categories.map((c) => c.smsOptionNumber));
    let num = 1;
    while (used.has(num) && num <= 3) num++;
    if (num > 3) return;
    setCategories((prev) => [
      ...prev,
      {
        name,
        smsOptionNumber: num,
        isActive: true,
        isCustom: true,
        maxVotesPerPhone: 1,
      },
    ]);
    setCustomName("");
  }

  function removeCategory(index: number) {
    userEditedRef.current = true;
    setCategories((prev) => prev.filter((_, i) => i !== index));
  }

  function validateBeforeSave(): string | null {
    const active = categories.filter((c) => c.isActive);
    if (smsVotingEnabled && active.length === 0) {
      return "Choose at least one voting category when SMS voting is enabled.";
    }
    return null;
  }

  async function handleSave() {
    setMessage(null);
    const validationError = validateBeforeSave();
    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    setSaving(true);
    try {
      const opens = splitDatetimeLocal(smsVotingStartsAt);
      const closes = splitDatetimeLocal(smsVotingEndsAt);
      const res = await fetch(`/api/events/${eventId}/sms-voting`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smsVotingEnabled,
          smsVotingStartsAt: zonedLocalToUtcIso(
            opens.date,
            opens.time,
            eventTimeZone,
          ),
          smsVotingEndsAt: zonedLocalToUtcIso(
            closes.date,
            closes.time,
            eventTimeZone,
          ),
          categories,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      const savedCategories = (data.categories ?? []) as CategoryRow[];
      const savedEnabled = Boolean(data.smsVotingEnabled);
      setCategories(savedCategories);
      setSmsPresets(data.presets ?? []);
      setInstructionPreview(data.instructionPreview ?? "");
      setSmsVotingEnabled(savedEnabled);
      userEditedRef.current = false;
      syncStatus(savedEnabled, savedCategories, "save");
      setMessage({ type: "success", text: "SMS voting settings saved." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading SMS voting settings…
      </div>
    );
  }

  const hasCustom = categories.some((c) => c.isCustom);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <input
          id="smsVotingEnabled"
          type="checkbox"
          checked={smsVotingEnabled}
          onChange={(e) => handleEnableChange(e.target.checked)}
          className="size-4 rounded border-gray-300"
        />
        <Label htmlFor="smsVotingEnabled" className="cursor-pointer font-medium">
          Enable SMS voting for this event
        </Label>
      </div>

      {smsVotingEnabled ? (
        <>
          <div className="flex items-start gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
            <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <p>
                All events share the SMS number{" "}
                <span className="font-mono font-semibold">{smsNumber || "—"}</span>.
                Voters text the vehicle ID from the dash card (e.g.{" "}
                <span className="font-mono">AXY-004</span>); the first 3 letters
                identify the event.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smsVotingStartsAt">Voting opens</Label>
              <DatetimeLocalField
                id="smsVotingStartsAt"
                aria-label="Voting opens"
                value={smsVotingStartsAt}
                onChange={(value) => {
                  userEditedRef.current = true;
                  setSmsVotingStartsAt(value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smsVotingEndsAt">Voting closes</Label>
              <DatetimeLocalField
                id="smsVotingEndsAt"
                aria-label="Voting closes"
                value={smsVotingEndsAt}
                onChange={(value) => {
                  userEditedRef.current = true;
                  setSmsVotingEndsAt(value);
                }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>
              Voting categories{" "}
              <span className="text-destructive" aria-hidden>
                *
              </span>
              <span className="sr-only"> (required)</span>
              <span className="font-normal text-muted-foreground">
                {" "}
                (choose up to 3, SMS-eligible awards only)
              </span>
            </Label>
            {smsPresets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No SMS-eligible award categories are configured yet. A site admin
                can enable them under Global Settings → Award Categories.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {smsPresets.map((preset) => {
                  const selected = categories.some(
                    (c) => c.name === preset && !c.isCustom,
                  );
                  return (
                    <Button
                      key={preset}
                      type="button"
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      onClick={() => togglePreset(preset)}
                      disabled={!selected && categories.length >= 3}
                    >
                      {preset}
                    </Button>
                  );
                })}
              </div>
            )}

            {!hasCustom && categories.length < 3 ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[12rem] flex-1 space-y-1">
                  <Label htmlFor="customCategory">Custom category (optional)</Label>
                  <Input
                    id="customCategory"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Club President's Pick"
                    maxLength={80}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addCustomCategory}
                  disabled={!customName.trim()}
                >
                  Add custom
                </Button>
              </div>
            ) : null}

            {categories.length > 0 ? (
              <ul className="space-y-2 rounded-lg border p-3 text-sm">
                {categories.map((cat, index) => (
                  <li
                    key={`${cat.name}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <span>
                      <span className="font-medium">{cat.name}</span>
                      {cat.isCustom ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (custom)
                        </span>
                      ) : null}
                      <span className="ml-2 font-mono text-muted-foreground">
                        SMS reply {cat.smsOptionNumber}
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCategory(index)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select at least one category when SMS voting is enabled.
              </p>
            )}
          </div>

          {instructionPreview ? (
            <div className="rounded-lg border border-dashed px-4 py-3 text-sm">
              <p className="font-medium">Dash card instruction preview</p>
              <p className="mt-1 text-muted-foreground">{instructionPreview}</p>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Turn on SMS voting above to choose voting categories and schedule.
        </p>
      )}

      {message ? (
        <p
          className={
            message.type === "success"
              ? "text-sm text-green-700 dark:text-green-400"
              : "text-sm text-destructive"
          }
        >
          {message.text}
        </p>
      ) : null}

      <Button type="button" onClick={() => void handleSave()} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save SMS voting settings"
        )}
      </Button>
    </div>
  );
}
