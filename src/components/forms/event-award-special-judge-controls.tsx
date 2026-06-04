"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpecialJudgeMultiSelect } from "@/components/forms/special-judge-multi-select";
import type {
  EventAwardRow,
  SpecialJudgeStaffOption,
} from "@/hooks/use-event-setup-cache";

/** Shown when the organizer enables Special Judge without staff in that role. */
export const SPECIAL_JUDGE_STAFF_REQUIRED_MESSAGE =
  "Before you can designate that an award is selected by a special judge, you must add a person to the event staff with the role of \"Special Judge\".";

export function EventAwardSpecialJudgeControls({
  eventId,
  award,
  specialJudgeStaff,
  busy: parentBusy,
  onSaved,
}: {
  eventId: string;
  award: EventAwardRow;
  specialJudgeStaff: SpecialJudgeStaffOption[];
  busy?: boolean;
  onSaved: (patch: Partial<EventAwardRow>) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [staffNotice, setStaffNotice] = useState("");
  const [requiresSpecialJudge, setRequiresSpecialJudge] = useState(
    award.requiresSpecialJudge ?? false,
  );
  const [judgeIds, setJudgeIds] = useState<string[]>(
    award.assignedSpecialJudgeUserIds ?? [],
  );

  useEffect(() => {
    setRequiresSpecialJudge(award.requiresSpecialJudge ?? false);
    setJudgeIds(award.assignedSpecialJudgeUserIds ?? []);
  }, [
    award.id,
    award.requiresSpecialJudge,
    award.assignedSpecialJudgeUserIds,
  ]);

  const persistedRequires = award.requiresSpecialJudge ?? false;
  const persistedIds = award.assignedSpecialJudgeUserIds ?? [];
  const dirty =
    requiresSpecialJudge !== persistedRequires ||
    (requiresSpecialJudge &&
      (judgeIds.length !== persistedIds.length ||
        judgeIds.some((id) => !persistedIds.includes(id))));

  const disabled = parentBusy || saving;
  const showSave =
    dirty || (requiresSpecialJudge && judgeIds.length > 0 && !persistedRequires);

  async function save() {
    if (requiresSpecialJudge && specialJudgeStaff.length === 0) {
      setStaffNotice(SPECIAL_JUDGE_STAFF_REQUIRED_MESSAGE);
      return;
    }
    if (requiresSpecialJudge && judgeIds.length === 0) {
      setError("Select at least one Special Judge from the list.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `/api/events/${eventId}/awards/${award.id}/ballot-special-judge`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            requiresSpecialJudge,
            assignedSpecialJudgeUserIds: requiresSpecialJudge ? judgeIds : [],
          }),
        },
      );
      const data = (await res.json()) as {
        config?: {
          ballotCategoryId: string;
          requiresSpecialJudge: boolean;
          assignedSpecialJudgeUserIds: string[];
        };
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Could not save.");
      onSaved({
        requiresSpecialJudge: data.config?.requiresSpecialJudge,
        assignedSpecialJudgeUserIds:
          data.config?.assignedSpecialJudgeUserIds,
        ballotCategoryId: data.config?.ballotCategoryId,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function stopRowSelect(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  const needsStaff =
    requiresSpecialJudge && specialJudgeStaff.length === 0;

  return (
    <div
      className="flex min-w-0 max-w-[min(100%,22rem)] shrink-0 flex-col items-end gap-1"
      onClick={stopRowSelect}
      onKeyDown={stopRowSelect}
      role="presentation"
    >
      <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
        <label
          className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground"
          title="Only assigned Special Judges can vote for this award"
        >
          <input
            type="checkbox"
            className="size-3.5 rounded border"
            checked={requiresSpecialJudge}
            disabled={disabled}
            onChange={(e) => {
              const on = e.target.checked;
              if (on && specialJudgeStaff.length === 0) {
                setStaffNotice(SPECIAL_JUDGE_STAFF_REQUIRED_MESSAGE);
                setRequiresSpecialJudge(false);
                setJudgeIds([]);
                setError("");
                return;
              }
              setRequiresSpecialJudge(on);
              if (!on) setJudgeIds([]);
              setError("");
              setStaffNotice("");
            }}
          />
          <span className="font-medium text-foreground">Special Judge</span>
        </label>

        {requiresSpecialJudge && specialJudgeStaff.length > 0 ? (
          <SpecialJudgeMultiSelect
            staff={specialJudgeStaff}
            selectedUserIds={judgeIds}
            onSelectedUserIdsChange={(ids) => {
              setJudgeIds(ids);
              setError("");
              setStaffNotice("");
            }}
            disabled={disabled}
          />
        ) : null}

        {showSave && !needsStaff ? (
          <Button
            type="button"
            size="sm"
            variant={dirty ? "default" : "outline"}
            className="h-7 px-2 text-[10px]"
            disabled={
              disabled ||
              (requiresSpecialJudge && judgeIds.length === 0)
            }
            onClick={() => void save()}
          >
            {saving ? (
              <Loader2 className="size-3 animate-spin" aria-hidden />
            ) : (
              "Save"
            )}
          </Button>
        ) : persistedRequires && !dirty && !needsStaff ? (
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            Saved
          </span>
        ) : null}
      </div>

      {staffNotice || needsStaff ? (
        <p
          className="text-right text-[11px] leading-snug text-amber-900 dark:text-amber-100"
          role="status"
        >
          {staffNotice || SPECIAL_JUDGE_STAFF_REQUIRED_MESSAGE}
        </p>
      ) : null}

      {error ? (
        <p className="text-right text-[10px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
