"use client";

import { useRef, useState } from "react";
import { GripVertical, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  EventTemplateSummary,
  VehicleClassOption,
} from "@/components/organizer/awards-judging/score-sheet-types";

function VehicleClassMultiSelect({
  options,
  selected,
  disabled,
  onChange,
}: {
  options: VehicleClassOption[];
  selected: string[];
  disabled?: boolean;
  onChange: (ids: string[]) => void;
}) {
  if (options.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Add vehicle classes under Registration to assign templates.
      </p>
    );
  }

  return (
    <div
      className="flex w-full flex-wrap gap-x-3 gap-y-2 rounded-md border bg-background p-2"
      onClick={(e) => e.stopPropagation()}
    >
      {options.map((opt) => {
        const checked = selected.includes(opt.id);
        return (
          <label
            key={opt.id}
            className="flex max-w-full cursor-pointer items-start gap-1.5 text-xs leading-snug"
          >
            <input
              type="checkbox"
              className="size-3.5 rounded border"
              checked={checked}
              disabled={disabled}
              onChange={() =>
                onChange(
                  checked
                    ? selected.filter((id) => id !== opt.id)
                    : [...selected, opt.id],
                )
              }
            />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}

export function ScoreSheetTemplateList({
  eventId,
  templates,
  vehicleClasses,
  selectedTemplateId,
  onSelectTemplate,
  onTemplatesChange,
  onVehicleClassError,
  onTemplateDeleted,
}: {
  eventId: string;
  templates: EventTemplateSummary[];
  vehicleClasses: VehicleClassOption[];
  selectedTemplateId: string | null;
  onSelectTemplate: (templateId: string) => void;
  onTemplatesChange: (templates: EventTemplateSummary[]) => void;
  onVehicleClassError: (message: string | null) => void;
  onTemplateDeleted?: (templateId: string) => void;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const [savingClassFor, setSavingClassFor] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const dragRef = useRef<number | null>(null);

  async function handleReorder(orderedIds: string[]) {
    setReordering(true);
    onVehicleClassError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/judging-templates/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedTemplateIds: orderedIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not reorder templates.");
      }
      onTemplatesChange(data.templates ?? []);
    } catch (e) {
      onVehicleClassError(e instanceof Error ? e.message : "Reorder failed.");
    } finally {
      setReordering(false);
    }
  }

  async function handleDelete(template: EventTemplateSummary) {
    const scoreSheets = template._count.scoreSheets;
    const message =
      scoreSheets > 0
        ? `Delete "${template.name}"? This permanently removes ${scoreSheets} score sheet${scoreSheets === 1 ? "" : "s"} and any judge assignments for this template.`
        : `Delete "${template.name}"? This cannot be undone.`;
    if (!window.confirm(message)) return;

    setDeletingId(template.id);
    onVehicleClassError(null);
    try {
      const res = await fetch(
        `/api/events/${eventId}/judging-templates/${template.id}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not delete template.");
      }
      onTemplatesChange(data.templates ?? []);
      onTemplateDeleted?.(template.id);
    } catch (e) {
      onVehicleClassError(
        e instanceof Error ? e.message : "Could not delete template.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function handleVehicleClassesChange(
    templateId: string,
    eligibleEventCategoryIds: string[],
  ) {
    setSavingClassFor(templateId);
    onVehicleClassError(null);
    try {
      const res = await fetch(
        `/api/events/${eventId}/judging-templates/${templateId}/vehicle-classes`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eligibleEventCategoryIds }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not update vehicle classes.");
      }
      onTemplatesChange(data.templates ?? []);
    } catch (e) {
      onVehicleClassError(
        e instanceof Error ? e.message : "Vehicle class update failed.",
      );
    } finally {
      setSavingClassFor(null);
    }
  }

  function handleDragStart(idx: number) {
    dragRef.current = idx;
    setDragIdx(idx);
  }

  function handleDrop(idx: number) {
    const from = dragRef.current;
    if (from === null || from === idx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const copy = [...templates];
    const [moved] = copy.splice(from, 1);
    copy.splice(idx, 0, moved);
    setDragIdx(null);
    setOverIdx(null);
    void handleReorder(copy.map((t) => t.id));
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No score sheet templates yet. Add a template from the global library below.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {reordering ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Saving order…
        </p>
      ) : null}
      {templates.map((t, idx) => {
        const selected = selectedTemplateId === t.id;
        const savingClasses = savingClassFor === t.id;
        const deleting = deletingId === t.id;
        return (
          <div
            key={t.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectTemplate(t.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectTemplate(t.id);
              }
            }}
            className={`grid cursor-pointer gap-3 rounded-md border p-3 text-sm transition-colors hover:bg-accent/40 sm:grid-cols-2 ${
              selected ? "border-primary bg-accent/30" : ""
            } ${dragIdx === idx ? "opacity-50" : ""} ${
              overIdx === idx && dragIdx !== null && dragIdx !== idx
                ? "ring-2 ring-primary/40"
                : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setOverIdx(idx);
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(idx);
            }}
          >
            <div className="flex min-w-0 items-start gap-2 sm:max-w-full">
              <button
                type="button"
                draggable
                aria-label="Reorder template"
                className="mt-0.5 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
                onClick={(e) => e.stopPropagation()}
                onDragStart={() => handleDragStart(idx)}
                onDragEnd={() => {
                  setDragIdx(null);
                  setOverIdx(null);
                }}
              >
                <GripVertical className="size-4" />
              </button>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.totalPoints} pts · {t._count.sections} categories ·{" "}
                      {t._count.scoreSheets} score sheet
                      {t._count.scoreSheets === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {t.editLock.replace(/_/g, " ")}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      aria-label={`Delete ${t.name}`}
                      disabled={deleting || reordering}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(t);
                      }}
                    >
                      {deleting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0 sm:max-w-full">
              <span className="text-xs font-medium text-muted-foreground">
                Vehicle classes
                {savingClasses ? (
                  <Loader2 className="ml-1 inline size-3 animate-spin" />
                ) : null}
              </span>
              <VehicleClassMultiSelect
                options={vehicleClasses}
                selected={t.eligibleEventCategoryIds}
                disabled={savingClasses || reordering || deleting}
                onChange={(ids) => void handleVehicleClassesChange(t.id, ids)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
