"use client";

import type { Dispatch, SetStateAction } from "react";
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
  patchItemAllowMultipleViolations,
  patchItemFullPointValue,
  patchItemScoringType,
  syncItemMaxPoints,
  SCORING_GROUP_PRESETS,
  SCORING_TYPE_OPTIONS,
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
import { ScoringTemplateExcelToolbar } from "@/components/organizer/awards-judging/scoring-template-excel-toolbar";
import { SubcategoryDeductionNotesField } from "@/components/organizer/awards-judging/subcategory-deduction-notes-field";

function move<T>(list: T[], from: number, to: number): T[] {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
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
  templateNameLabel = "Event template name",
  excelExportHref,
  excelImportHref,
  onExcelImportSuccess,
  onExcelError,
}: {
  draft: TemplateDraft;
  setDraft: Dispatch<SetStateAction<TemplateDraft | null>>;
  editLockInfo: EditLockInfo;
  warnings: ValidationWarning[];
  blockingErrors: string[];
  saving: boolean;
  onSave: () => void;
  showPreview: boolean;
  onTogglePreview: () => void;
  showArchived: boolean;
  onShowArchivedChange: (v: boolean) => void;
  /** Label for the template title field (e.g. master vs event copy). */
  templateNameLabel?: string;
  excelExportHref?: string;
  excelImportHref?: string;
  onExcelImportSuccess?: (data: unknown) => void;
  onExcelError?: (message: string | null) => void;
}) {
  const structureLocked = !editLockInfo.canEditStructure;
  const isOriginalityTemplate = draft.methodology === "ORIGINALITY_CONDITION";
  const runningTotal = templateSectionsTotal(draft);
  const totalMismatch = runningTotal !== draft.totalPoints;

  function updateSection(index: number, patch: Partial<SectionDraft>) {
    setDraft((prev) => {
      if (!prev) return prev;
      const sections = prev.sections.map((s, i) =>
        i === index ? { ...s, ...patch } : s,
      );
      return { ...prev, sections };
    });
  }

  function archiveOrRemoveSection(si: number) {
    setDraft((prev) => {
      if (!prev) return prev;
      const section = prev.sections[si];
      if (!section) return prev;
      const archive =
        editLockInfo.scoreSheetCount > 0 && isPersistedClientKey(section.clientKey);
      if (archive) {
        const sections = prev.sections.map((s, i) =>
          i === si ? { ...s, isActive: false } : s,
        );
        return { ...prev, sections };
      }
      return { ...prev, sections: prev.sections.filter((_, i) => i !== si) };
    });
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

      {excelExportHref && excelImportHref && onExcelImportSuccess && onExcelError ? (
        <ScoringTemplateExcelToolbar
          exportHref={excelExportHref}
          importHref={excelImportHref}
          structureLocked={structureLocked}
          onImportSuccess={onExcelImportSuccess}
          onError={onExcelError}
        />
      ) : null}

      <div className="space-y-2">
        <Label>{templateNameLabel}</Label>
        <Input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[120px] flex-1 space-y-1.5">
          <Label>Organization</Label>
          <Input
            value={draft.scoringGroup}
            disabled={structureLocked}
            list="organization-presets"
            placeholder="e.g. AACA, PCA, NCRS"
            onChange={(e) => {
              const organization = e.target.value;
              const orgUpper = organization.trim().toUpperCase();
              setDraft({
                ...draft,
                scoringGroup: organization,
                vehicleType:
                  orgUpper === "PCA" &&
                  (!draft.vehicleType.trim() ||
                    draft.vehicleType.trim().toLowerCase() === "auto")
                    ? "Concours"
                    : draft.vehicleType,
              });
            }}
          />
          <datalist id="organization-presets">
            {SCORING_GROUP_PRESETS.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </div>
        <div className="w-36 space-y-1.5">
          <Label>Vehicle type</Label>
          <Input
            value={draft.vehicleType}
            disabled={structureLocked}
            list="vehicle-type-presets"
            placeholder="e.g. Concours"
            onChange={(e) => setDraft({ ...draft, vehicleType: e.target.value })}
          />
          <datalist id="vehicle-type-presets">
            {VEHICLE_TYPE_PRESETS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div className="min-w-[160px] flex-1 space-y-1.5">
          <Label>Scoring method</Label>
          {isOriginalityTemplate ? (
            <p className="flex h-9 items-center rounded-md border border-input bg-muted/30 px-3 text-xs">
              Originality / Condition
            </p>
          ) : (
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={draft.methodology}
              disabled={structureLocked}
              title={
                METHODOLOGY_OPTIONS.find((o) => o.value === draft.methodology)?.hint
              }
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
        </div>
        <div className="w-28 space-y-1.5">
          <Label>Total points</Label>
          <Input
            type="number"
            min={1}
            className="h-9"
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
          Show removed categories/subcategories
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
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        sections: [
                          ...prev.sections,
                          defaultSectionDraft(prev.sections.length),
                        ],
                      }
                    : prev,
                )
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
                (section.isActive === false ? " (removed)" : "")
              }
              defaultOpen={si === 0}
              badge={
                <Badge variant={itemMismatch ? "warning" : "outline"}>
                  {sectionMax} pts
                </Badge>
              }
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[120px] flex-1 space-y-1.5">
                    <Label>Category label</Label>
                    <Input
                      value={section.name}
                      disabled={structureLocked}
                      onChange={(e) => updateSection(si, { name: e.target.value })}
                    />
                  </div>
                  <div className="w-32 space-y-1.5">
                    <Label>Category max score</Label>
                    <Input
                      type="number"
                      min={1}
                      value={section.maxSectionPoints}
                      disabled={structureLocked}
                      onChange={(e) =>
                        updateSection(si, { maxSectionPoints: e.target.value })
                      }
                      placeholder="Max"
                      required
                    />
                  </div>
                  <div className="min-w-[180px] flex-[2] space-y-1.5">
                    <Label>Category judging guidelines</Label>
                    <Input
                      value={section.judgeGuidance}
                      disabled={structureLocked}
                      onChange={(e) =>
                        updateSection(si, { judgeGuidance: e.target.value })
                      }
                      placeholder="Optional notes for judges"
                    />
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1 self-end">
                    {!structureLocked && si > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label="Move category up"
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
                        aria-label="Move category down"
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
                          Restore
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => archiveOrRemoveSection(si)}
                        >
                          <Trash2 className="mr-1 size-4" />
                          Remove
                        </Button>
                      )
                    ) : null}
                  </div>
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
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-sm font-medium">Subcategory</p>
                            <label className="flex items-center gap-2 text-sm font-normal">
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
                              Indent
                            </label>
                          </div>
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
                                Restore
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => archiveOrRemoveItem(si, ii)}
                              >
                                <Trash2 className="mr-1 size-4" />
                                Remove
                              </Button>
                            )
                          ) : null}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex flex-nowrap items-end gap-3 overflow-x-auto pb-0.5">
                            <div className="min-w-[140px] flex-[2] space-y-1.5">
                              <Label>Subcategory name</Label>
                              <Input
                                className="h-9"
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
                            <div className="w-28 shrink-0 space-y-1.5">
                              <Label>Subcategory maximum score</Label>
                              <Input
                                type="number"
                                min={1}
                                className="h-9"
                                value={item.maxPoints}
                                disabled={structureLocked}
                                onChange={(e) => {
                                  const maxPoints = Math.max(
                                    1,
                                    parseInt(e.target.value, 10) || 1,
                                  );
                                  const items = section.items.map((it, j) =>
                                    j === ii ? syncItemMaxPoints(it, maxPoints) : it,
                                  );
                                  updateSection(si, { items });
                                }}
                              />
                            </div>
                            {!isOriginalityTemplate ? (
                              <div className="w-36 shrink-0 space-y-1.5">
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
                                  <option value="">Inherit</option>
                                  <option value="ADD">Add</option>
                                  <option value="DEDUCT">Deduct</option>
                                </select>
                              </div>
                            ) : null}
                            <div className="min-w-[11rem] flex-1 shrink-0 space-y-1.5">
                              <Label>Scoring type</Label>
                              <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                value={item.scoringType}
                                disabled={structureLocked || isOriginalityTemplate}
                                title={
                                  SCORING_TYPE_OPTIONS.find(
                                    (o) => o.value === item.scoringType,
                                  )?.hint
                                }
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
                                {SCORING_TYPE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {
                              SCORING_TYPE_OPTIONS.find(
                                (o) => o.value === item.scoringType,
                              )?.hint
                            }
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          {item.scoringType !== "DISCRETIONARY" ? (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={item.allowMultipleViolations}
                                disabled={structureLocked}
                                onChange={(e) => {
                                  const items = section.items.map((it, j) =>
                                    j === ii
                                      ? patchItemAllowMultipleViolations(
                                          it,
                                          e.target.checked,
                                        )
                                      : it,
                                  );
                                  updateSection(si, { items });
                                }}
                                className="size-4 rounded border"
                              />
                              Allow multiple violations
                            </label>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Multiple violations do not apply to discretionary scoring.
                            </span>
                          )}
                          {!isOriginalityTemplate ? (
                            <SubcategoryDeductionNotesField
                              checked={item.requiresCommentOnDeduction}
                              disabled={structureLocked}
                              onChange={(checked) => {
                                const items = section.items.map((it, j) =>
                                  j === ii
                                    ? { ...it, requiresCommentOnDeduction: checked }
                                    : it,
                                );
                                updateSection(si, { items });
                              }}
                            />
                          ) : null}
                        </div>

                        <div>
                          <button
                            type="button"
                            className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
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

                        {item.scoringType === "FULL" ? (
                          <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                            <p className="text-sm font-medium">Point value</p>
                            <p className="text-xs text-muted-foreground">
                              {item.allowMultipleViolations
                                ? `Each violation deducts this many points. Total deduction cannot exceed the subcategory maximum (${item.maxPoints} pts)—for example, 1 pt × 10+ violations still caps at ${item.maxPoints} pts.`
                                : `When a judge marks this subcategory as observed, this full amount is deducted (all or nothing). Usually matches the subcategory maximum (${item.maxPoints} pts).`}
                            </p>
                            <div className="max-w-xs space-y-1.5">
                              <Label htmlFor={`full-pts-${item.clientKey}`}>
                                {item.allowMultipleViolations
                                  ? "Points per violation"
                                  : "Deduction if observed"}
                              </Label>
                              <Input
                                id={`full-pts-${item.clientKey}`}
                                type="number"
                                min={1}
                                max={item.maxPoints}
                                className="h-9"
                                disabled={structureLocked}
                                value={
                                  item.deductionOptions[0]?.pointsDeducted ?? 1
                                }
                                onChange={(e) => {
                                  const items = section.items.map((it, j) =>
                                    j === ii
                                      ? patchItemFullPointValue(
                                          it,
                                          parseInt(e.target.value, 10) || 1,
                                        )
                                      : it,
                                  );
                                  updateSection(si, { items });
                                }}
                              />
                            </div>
                          </div>
                        ) : item.scoringType !== "DISCRETIONARY" ? (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Increment levels</p>
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
                            {!structureLocked && item.scoringType === "LEVELS" ? (
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
