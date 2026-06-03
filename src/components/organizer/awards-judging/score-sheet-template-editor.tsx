"use client";

import type {
  JudgingSubcategoryPointType,
  JudgingSubcategoryScoringType,
} from "@prisma/client";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import {
  defaultItemDraft,
  defaultSectionDraft,
  isPersistedClientKey,
  itemPointsTotal,
  METHODOLOGY_OPTIONS,
  newClientKey,
  SCORING_GROUP_PRESETS,
  sectionPointsTotal,
  templateSectionsTotal,
  VEHICLE_TYPE_PRESETS,
  type EditLockInfo,
  type ItemDraft,
  type SectionDraft,
  type TemplateDraft,
  type ValidationWarning,
} from "@/components/organizer/awards-judging/score-sheet-types";
import { ScoreSheetTemplatePreview } from "@/components/organizer/awards-judging/score-sheet-template-preview";

function move<T>(list: T[], from: number, to: number): T[] {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function patchItemScoringType(
  item: ItemDraft,
  scoringType: JudgingSubcategoryScoringType,
): ItemDraft {
  if (scoringType === "DISCRETIONARY") {
    return {
      ...item,
      scoringType,
      allowMultipleViolations: false,
      deductionOptions: [],
    };
  }
  if (scoringType === "FULL") {
    const first = item.deductionOptions[0];
    return {
      ...item,
      scoringType,
      deductionOptions: [
        {
          clientKey: first?.clientKey ?? newClientKey(),
          label: first?.label?.trim() ? first.label : "Select",
          pointsDeducted: first?.pointsDeducted ?? 1,
          sortOrder: 0,
          deductionBucket: first?.deductionBucket ?? null,
        },
      ],
    };
  }
  return { ...item, scoringType };
}

export function ScoreSheetTemplateEditor({
  draft,
  setDraft,
  editLockInfo,
  warnings,
  blockingErrors,
  saving,
  onSave,
  showPreview,
  onTogglePreview,
  showArchived,
  onShowArchivedChange,
}: {
  draft: TemplateDraft;
  setDraft: (d: TemplateDraft) => void;
  editLockInfo: EditLockInfo;
  warnings: ValidationWarning[];
  blockingErrors: string[];
  saving: boolean;
  onSave: () => void;
  showPreview: boolean;
  onTogglePreview: () => void;
  showArchived: boolean;
  onShowArchivedChange: (v: boolean) => void;
}) {
  const structureLocked = !editLockInfo.canEditStructure;
  const isOriginalityTemplate = draft.methodology === "ORIGINALITY_CONDITION";
  const runningTotal = templateSectionsTotal(draft);
  const totalMismatch = runningTotal !== draft.totalPoints;

  function updateSection(index: number, patch: Partial<SectionDraft>) {
    const sections = draft.sections.map((s, i) =>
      i === index ? { ...s, ...patch } : s,
    );
    setDraft({ ...draft, sections });
  }

  function archiveOrRemoveSection(si: number) {
    const section = draft.sections[si];
    if (!section) return;
    const archive =
      editLockInfo.scoreSheetCount > 0 && isPersistedClientKey(section.clientKey);
    if (archive) {
      updateSection(si, { isActive: false });
      return;
    }
    setDraft({ ...draft, sections: draft.sections.filter((_, i) => i !== si) });
  }

  function archiveOrRemoveItem(si: number, ii: number) {
    const section = draft.sections[si];
    const item = section?.items[ii];
    if (!section || !item) return;
    const archive =
      editLockInfo.scoreSheetCount > 0 && isPersistedClientKey(item.clientKey);
    if (archive) {
      const items = section.items.map((it, j) =>
        j === ii ? { ...it, isActive: false } : it,
      );
      updateSection(si, { items });
      return;
    }
    updateSection(si, { items: section.items.filter((_, j) => j !== ii) });
  }

  return (
    <div className="space-y-6">
      {editLockInfo.showDraftWarning ? (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
          Draft score sheets exist. Structural changes may affect in-progress judging.
        </div>
      ) : null}
      {structureLocked ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          Submitted or finalized score sheets exist. Structural edits are locked. Judge
          guidance text can still be updated when safe.
        </div>
      ) : null}

      {blockingErrors.length > 0 ? (
        <div
          className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm"
          role="alert"
        >
          <p className="font-medium">Fix these issues before saving:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {blockingErrors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Event template name</Label>
          <Input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Scoring group</Label>
          <Input
            value={draft.scoringGroup}
            disabled={structureLocked}
            list="scoring-group-presets"
            placeholder="e.g. AACA, PCA, NCRS"
            onChange={(e) => setDraft({ ...draft, scoringGroup: e.target.value })}
          />
          <datalist id="scoring-group-presets">
            {SCORING_GROUP_PRESETS.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </div>
        <div className="space-y-2">
          <Label>Vehicle type</Label>
          <Input
            value={draft.vehicleType}
            disabled={structureLocked}
            list="vehicle-type-presets"
            placeholder="e.g. Auto, Motorcycle"
            onChange={(e) => setDraft({ ...draft, vehicleType: e.target.value })}
          />
          <datalist id="vehicle-type-presets">
            {VEHICLE_TYPE_PRESETS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div className="space-y-2">
          <Label>Scoring method</Label>
          {isOriginalityTemplate ? (
            <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              Originality / Condition (legacy Marque-style). Scoring type controls are
              limited; bucket deductions remain available on increment levels.
            </p>
          ) : (
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={draft.methodology}
              disabled={structureLocked}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  methodology: e.target.value as TemplateDraft["methodology"],
                })
              }
            >
              {METHODOLOGY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          {!isOriginalityTemplate ? (
            <p className="text-xs text-muted-foreground">
              {METHODOLOGY_OPTIONS.find((o) => o.value === draft.methodology)?.hint}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>Total points</Label>
          <Input
            type="number"
            min={1}
            value={draft.totalPoints}
            disabled={structureLocked}
            onChange={(e) =>
              setDraft({
                ...draft,
                totalPoints: Math.max(1, parseInt(e.target.value, 10) || 1),
              })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={draft.description}
          rows={2}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline">{draft.methodology.replace(/_/g, " ")}</Badge>
        <span>
          Running category total:{" "}
          <strong className={totalMismatch ? "text-destructive" : ""}>
            {runningTotal}
          </strong>{" "}
          / {draft.totalPoints}
        </span>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => onShowArchivedChange(e.target.checked)}
            className="size-4 rounded border"
          />
          Show archived categories/subcategories
        </label>
      </div>

      {warnings.map((w, i) => (
        <p key={i} className="text-sm text-amber-600 dark:text-amber-400">
          {w.message}
        </p>
      ))}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Categories</h3>
          {!structureLocked ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setDraft({
                  ...draft,
                  sections: [
                    ...draft.sections,
                    defaultSectionDraft(draft.sections.length),
                  ],
                })
              }
            >
              <Plus className="mr-1 size-4" />
              Add category
            </Button>
          ) : null}
        </div>

        {draft.sections.map((section, si) => {
          if (!showArchived && section.isActive === false) return null;

          const itemTotal = itemPointsTotal(section);
          const sectionMax = sectionPointsTotal(section);
          const itemMismatch =
            section.maxSectionPoints.trim() !== "" &&
            itemTotal !== parseInt(section.maxSectionPoints, 10);

          return (
            <CollapsibleCard
              key={section.clientKey}
              title={
                (section.name || "Category") +
                (section.isActive === false ? " (archived)" : "")
              }
              defaultOpen={si === 0}
              badge={
                <Badge variant={itemMismatch ? "warning" : "outline"}>
                  {sectionMax} pts
                </Badge>
              }
            >
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Category name</Label>
                    <Input
                      value={section.name}
                      disabled={structureLocked}
                      onChange={(e) => updateSection(si, { name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category max score</Label>
                    <Input
                      type="number"
                      min={1}
                      value={section.maxSectionPoints}
                      disabled={structureLocked}
                      onChange={(e) =>
                        updateSection(si, { maxSectionPoints: e.target.value })
                      }
                      placeholder="Required positive integer"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Weight % (optional)</Label>
                    <Input
                      value={section.weightPercent}
                      disabled={structureLocked}
                      onChange={(e) =>
                        updateSection(si, { weightPercent: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    {!structureLocked && si > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            sections: move(draft.sections, si, si - 1),
                          })
                        }
                      >
                        <ChevronUp className="size-4" />
                      </Button>
                    ) : null}
                    {!structureLocked && si < draft.sections.length - 1 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            sections: move(draft.sections, si, si + 1),
                          })
                        }
                      >
                        <ChevronDown className="size-4" />
                      </Button>
                    ) : null}
                    {!structureLocked ? (
                      section.isActive === false ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateSection(si, { isActive: true })}
                        >
                          Restore category
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => archiveOrRemoveSection(si)}
                        >
                          <Trash2 className="size-4" />
                          {editLockInfo.scoreSheetCount > 0 &&
                          isPersistedClientKey(section.clientKey)
                            ? "Archive"
                            : "Remove"}
                        </Button>
                      )
                    ) : null}
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    className="text-sm font-medium underline"
                    onClick={() =>
                      updateSection(si, { guidanceOpen: !section.guidanceOpen })
                    }
                  >
                    Category judging guidelines {section.guidanceOpen ? "▾" : "▸"}
                  </button>
                  {section.guidanceOpen ? (
                    <Textarea
                      className="mt-2"
                      rows={2}
                      value={section.judgeGuidance}
                      onChange={(e) =>
                        updateSection(si, { judgeGuidance: e.target.value })
                      }
                    />
                  ) : null}
                </div>

                {itemMismatch ? (
                  <p className="text-sm text-amber-600">
                    Subcategory totals ({itemTotal}) do not match category max (
                    {section.maxSectionPoints}).
                  </p>
                ) : null}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Subcategories</p>
                    {!structureLocked ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const items = [
                            ...section.items,
                            defaultItemDraft(section.items.length),
                          ];
                          updateSection(si, { items });
                        }}
                      >
                        <Plus className="mr-1 size-3" />
                        Add subcategory
                      </Button>
                    ) : null}
                  </div>

                  {section.items.map((item, ii) => {
                    if (!showArchived && item.isActive === false) return null;

                    return (
                      <div
                        key={item.clientKey}
                        className={`space-y-3 rounded-md border p-3 ${
                          item.isActive === false ? "opacity-60" : ""
                        }`}
                      >
                        <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
                          <div className="space-y-2">
                            <Label>Subcategory name</Label>
                            <Input
                              value={item.label}
                              disabled={structureLocked}
                              onChange={(e) => {
                                const items = section.items.map((it, j) =>
                                  j === ii ? { ...it, label: e.target.value } : it,
                                );
                                updateSection(si, { items });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Max score</Label>
                            <Input
                              type="number"
                              min={1}
                              value={item.maxPoints}
                              disabled={structureLocked}
                              onChange={(e) => {
                                const items = section.items.map((it, j) =>
                                  j === ii
                                    ? {
                                        ...it,
                                        maxPoints: Math.max(
                                          1,
                                          parseInt(e.target.value, 10) || 1,
                                        ),
                                      }
                                    : it,
                                );
                                updateSection(si, { items });
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={item.isIndented}
                              disabled={structureLocked}
                              onChange={(e) => {
                                const items = section.items.map((it, j) =>
                                  j === ii
                                    ? { ...it, isIndented: e.target.checked }
                                    : it,
                                );
                                updateSection(si, { items });
                              }}
                              className="size-4 rounded border"
                            />
                            Indent subcategory
                          </label>
                          {!isOriginalityTemplate ? (
                            <div className="space-y-2">
                              <Label>Point type</Label>
                              <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                value={item.pointType ?? ""}
                                disabled={structureLocked}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  const items = section.items.map((it, j) =>
                                    j === ii
                                      ? {
                                          ...it,
                                          pointType:
                                            v === ""
                                              ? null
                                              : (v as JudgingSubcategoryPointType),
                                        }
                                      : it,
                                  );
                                  updateSection(si, { items });
                                }}
                              >
                                <option value="">Inherit scoring method</option>
                                <option value="ADD">Add</option>
                                <option value="DEDUCT">Deduct</option>
                              </select>
                            </div>
                          ) : null}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Scoring type</Label>
                            <select
                              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                              value={item.scoringType}
                              disabled={structureLocked || isOriginalityTemplate}
                              onChange={(e) => {
                                const scoringType = e.target
                                  .value as JudgingSubcategoryScoringType;
                                const items = section.items.map((it, j) =>
                                  j === ii
                                    ? patchItemScoringType(it, scoringType)
                                    : it,
                                );
                                updateSection(si, { items });
                              }}
                            >
                              <option value="FULL">Full (Select)</option>
                              <option value="LEVELS">Levels</option>
                              <option value="DISCRETIONARY">Discretionary</option>
                            </select>
                          </div>
                          {item.scoringType !== "DISCRETIONARY" ? (
                            <label className="flex items-end gap-2 pb-1 text-sm">
                              <input
                                type="checkbox"
                                checked={item.allowMultipleViolations}
                                disabled={structureLocked}
                                onChange={(e) => {
                                  const items = section.items.map((it, j) =>
                                    j === ii
                                      ? {
                                          ...it,
                                          allowMultipleViolations: e.target.checked,
                                        }
                                      : it,
                                  );
                                  updateSection(si, { items });
                                }}
                                className="size-4 rounded border"
                              />
                              Allow multiple violations
                            </label>
                          ) : (
                            <p className="pb-1 text-xs text-muted-foreground">
                              Multiple violations do not apply to discretionary scoring.
                            </p>
                          )}
                        </div>

                        {!isOriginalityTemplate ? (
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={item.requiresCommentOnDeduction}
                              disabled={structureLocked}
                              onChange={(e) => {
                                const items = section.items.map((it, j) =>
                                  j === ii
                                    ? {
                                        ...it,
                                        requiresCommentOnDeduction: e.target.checked,
                                      }
                                    : it,
                                );
                                updateSection(si, { items });
                              }}
                              className="size-4 rounded border"
                            />
                            Comment required on deduction
                          </label>
                        ) : null}

                        <div>
                          <button
                            type="button"
                            className="text-sm underline"
                            onClick={() => {
                              const items = section.items.map((it, j) =>
                                j === ii
                                  ? { ...it, guidanceOpen: !it.guidanceOpen }
                                  : it,
                              );
                              updateSection(si, { items });
                            }}
                          >
                            Judging guidelines {item.guidanceOpen ? "▾" : "▸"}
                          </button>
                          {item.guidanceOpen ? (
                            <Textarea
                              className="mt-2"
                              rows={2}
                              value={item.judgeGuidance}
                              onChange={(e) => {
                                const items = section.items.map((it, j) =>
                                  j === ii
                                    ? { ...it, judgeGuidance: e.target.value }
                                    : it,
                                );
                                updateSection(si, { items });
                              }}
                              placeholder="Help text shown to judges (info popup in mobile UI)"
                            />
                          ) : null}
                        </div>

                        {item.scoringType !== "DISCRETIONARY" ? (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">
                              Increment levels
                              {item.scoringType === "FULL"
                                ? " (exactly one — label usually “Select”)"
                                : null}
                            </p>
                            {item.deductionOptions.map((opt, oi) => (
                              <div
                                key={opt.clientKey}
                                className="grid gap-2 sm:grid-cols-[1fr_80px_auto]"
                              >
                                <Input
                                  value={opt.label}
                                  disabled={structureLocked}
                                  placeholder="Label"
                                  onChange={(e) => {
                                    const deductionOptions =
                                      item.deductionOptions.map((d, k) =>
                                        k === oi
                                          ? { ...d, label: e.target.value }
                                          : d,
                                      );
                                    const items = section.items.map((it, j) =>
                                      j === ii ? { ...it, deductionOptions } : it,
                                    );
                                    updateSection(si, { items });
                                  }}
                                />
                                <Input
                                  type="number"
                                  min={1}
                                  value={opt.pointsDeducted}
                                  disabled={structureLocked}
                                  onChange={(e) => {
                                    const deductionOptions =
                                      item.deductionOptions.map((d, k) =>
                                        k === oi
                                          ? {
                                              ...d,
                                              pointsDeducted: Math.max(
                                                1,
                                                parseInt(e.target.value, 10) || 1,
                                              ),
                                            }
                                          : d,
                                      );
                                    const items = section.items.map((it, j) =>
                                      j === ii ? { ...it, deductionOptions } : it,
                                    );
                                    updateSection(si, { items });
                                  }}
                                />
                                {!structureLocked &&
                                (item.scoringType !== "FULL" ||
                                  item.deductionOptions.length > 1) ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      const deductionOptions =
                                        item.deductionOptions.filter(
                                          (_, k) => k !== oi,
                                        );
                                      const items = section.items.map((it, j) =>
                                        j === ii ? { ...it, deductionOptions } : it,
                                      );
                                      updateSection(si, { items });
                                    }}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                ) : null}
                              </div>
                            ))}
                            {!structureLocked &&
                            (item.scoringType === "LEVELS" ||
                              (item.scoringType === "FULL" &&
                                item.deductionOptions.length === 0)) ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const deductionOptions = [
                                    ...item.deductionOptions,
                                    {
                                      clientKey: newClientKey(),
                                      label:
                                        item.scoringType === "FULL" ? "Select" : "",
                                      pointsDeducted: 1,
                                      sortOrder: item.deductionOptions.length,
                                      deductionBucket: null,
                                    },
                                  ];
                                  const patched = patchItemScoringType(
                                    { ...item, deductionOptions },
                                    item.scoringType,
                                  );
                                  const items = section.items.map((it, j) =>
                                    j === ii ? patched : it,
                                  );
                                  updateSection(si, { items });
                                }}
                              >
                                Add increment level
                              </Button>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Discretionary scoring uses a numeric input (0 through max
                            score). No increment levels are required.
                          </p>
                        )}

                        {isOriginalityTemplate ? (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">
                              Increment levels (O/C buckets optional)
                            </p>
                            {item.deductionOptions.map((opt, oi) => (
                              <div
                                key={opt.clientKey}
                                className="grid gap-2 sm:grid-cols-[1fr_80px_120px_auto]"
                              >
                                <Input
                                  value={opt.label}
                                  disabled={structureLocked}
                                  onChange={(e) => {
                                    const deductionOptions =
                                      item.deductionOptions.map((d, k) =>
                                        k === oi
                                          ? { ...d, label: e.target.value }
                                          : d,
                                      );
                                    const items = section.items.map((it, j) =>
                                      j === ii ? { ...it, deductionOptions } : it,
                                    );
                                    updateSection(si, { items });
                                  }}
                                />
                                <Input
                                  type="number"
                                  min={1}
                                  value={opt.pointsDeducted}
                                  disabled={structureLocked}
                                  onChange={(e) => {
                                    const deductionOptions =
                                      item.deductionOptions.map((d, k) =>
                                        k === oi
                                          ? {
                                              ...d,
                                              pointsDeducted: Math.max(
                                                1,
                                                parseInt(e.target.value, 10) || 1,
                                              ),
                                            }
                                          : d,
                                      );
                                    const items = section.items.map((it, j) =>
                                      j === ii ? { ...it, deductionOptions } : it,
                                    );
                                    updateSection(si, { items });
                                  }}
                                />
                                <select
                                  className="h-9 rounded-md border px-2 text-sm"
                                  value={opt.deductionBucket ?? ""}
                                  disabled={structureLocked}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    const deductionOptions =
                                      item.deductionOptions.map((d, k) =>
                                        k === oi
                                          ? {
                                              ...d,
                                              deductionBucket:
                                                v === ""
                                                  ? null
                                                  : (v as "ORIGINALITY" | "CONDITION"),
                                            }
                                          : d,
                                      );
                                    const items = section.items.map((it, j) =>
                                      j === ii ? { ...it, deductionOptions } : it,
                                    );
                                    updateSection(si, { items });
                                  }}
                                >
                                  <option value="">—</option>
                                  <option value="ORIGINALITY">Originality</option>
                                  <option value="CONDITION">Condition</option>
                                </select>
                                {!structureLocked ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      const deductionOptions =
                                        item.deductionOptions.filter((_, k) => k !== oi);
                                      const items = section.items.map((it, j) =>
                                        j === ii ? { ...it, deductionOptions } : it,
                                      );
                                      updateSection(si, { items });
                                    }}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                ) : null}
                              </div>
                            ))}
                            {!structureLocked ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const deductionOptions = [
                                    ...item.deductionOptions,
                                    {
                                      clientKey: newClientKey(),
                                      label: "",
                                      pointsDeducted: 1,
                                      sortOrder: item.deductionOptions.length,
                                      deductionBucket: null,
                                    },
                                  ];
                                  const items = section.items.map((it, j) =>
                                    j === ii ? { ...it, deductionOptions } : it,
                                  );
                                  updateSection(si, { items });
                                }}
                              >
                                Add increment level
                              </Button>
                            ) : null}
                          </div>
                        ) : null}

                        {!structureLocked ? (
                          item.isActive === false ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const items = section.items.map((it, j) =>
                                  j === ii ? { ...it, isActive: true } : it,
                                );
                                updateSection(si, { items });
                              }}
                            >
                              Restore subcategory
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => archiveOrRemoveItem(si, ii)}
                            >
                              {editLockInfo.scoreSheetCount > 0 &&
                              isPersistedClientKey(item.clientKey)
                                ? "Archive subcategory"
                                : "Remove subcategory"}
                            </Button>
                          )
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CollapsibleCard>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Save template
        </Button>
        <Button type="button" variant="outline" onClick={onTogglePreview}>
          {showPreview ? "Hide preview" : "Preview judge form"}
        </Button>
      </div>

      {showPreview ? <ScoreSheetTemplatePreview draft={draft} /> : null}
    </div>
  );
}
