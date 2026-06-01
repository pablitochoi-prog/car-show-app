"use client";

import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import {
  itemPointsTotal,
  newClientKey,
  sectionPointsTotal,
  templateSectionsTotal,
  type EditLockInfo,
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

export function ScoreSheetTemplateEditor({
  draft,
  setDraft,
  editLockInfo,
  warnings,
  saving,
  onSave,
  showPreview,
  onTogglePreview,
}: {
  draft: TemplateDraft;
  setDraft: (d: TemplateDraft) => void;
  editLockInfo: EditLockInfo;
  warnings: ValidationWarning[];
  saving: boolean;
  onSave: () => void;
  showPreview: boolean;
  onTogglePreview: () => void;
}) {
  const structureLocked = !editLockInfo.canEditStructure;
  const runningTotal = templateSectionsTotal(draft);
  const totalMismatch = runningTotal !== draft.totalPoints;

  function updateSection(index: number, patch: Partial<SectionDraft>) {
    const sections = draft.sections.map((s, i) =>
      i === index ? { ...s, ...patch } : s,
    );
    setDraft({ ...draft, sections });
  }

  function addSection() {
    setDraft({
      ...draft,
      sections: [
        ...draft.sections,
        {
          clientKey: newClientKey(),
          name: "New Judging Section",
          sortOrder: draft.sections.length,
          weightPercent: "",
          maxSectionPoints: "",
          judgeGuidance: "",
          items: [],
        },
      ],
    });
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Score Sheet Template Name</Label>
          <Input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Total Points</Label>
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
          Running section total:{" "}
          <strong className={totalMismatch ? "text-destructive" : ""}>
            {runningTotal}
          </strong>{" "}
          / {draft.totalPoints}
        </span>
      </div>

      {warnings.map((w, i) => (
        <p key={i} className="text-sm text-amber-600 dark:text-amber-400">
          {w.message}
        </p>
      ))}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Judging Sections</h3>
          {!structureLocked ? (
            <Button type="button" variant="outline" size="sm" onClick={addSection}>
              <Plus className="mr-1 size-4" />
              Add Section
            </Button>
          ) : null}
        </div>

        {draft.sections.map((section, si) => {
          const itemTotal = itemPointsTotal(section);
          const sectionMax = sectionPointsTotal(section);
          const itemMismatch =
            section.maxSectionPoints.trim() !== "" &&
            itemTotal !== parseInt(section.maxSectionPoints, 10);

          return (
            <CollapsibleCard
              key={section.clientKey}
              title={section.name || "Judging Section"}
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
                    <Label>Section Name</Label>
                    <Input
                      value={section.name}
                      disabled={structureLocked}
                      onChange={(e) => updateSection(si, { name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Section Points (optional)</Label>
                    <Input
                      value={section.maxSectionPoints}
                      disabled={structureLocked}
                      onChange={(e) =>
                        updateSection(si, { maxSectionPoints: e.target.value })
                      }
                      placeholder="Auto-sum from criteria"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Weight % (display)</Label>
                    <Input
                      value={section.weightPercent}
                      disabled={structureLocked}
                      onChange={(e) =>
                        updateSection(si, { weightPercent: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex items-end gap-2">
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            sections: draft.sections.filter((_, i) => i !== si),
                          })
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
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
                    Judge Guidance {section.guidanceOpen ? "▾" : "▸"}
                  </button>
                  {section.guidanceOpen ? (
                    <Textarea
                      className="mt-2"
                      rows={2}
                      value={section.judgeGuidance}
                      onChange={(e) =>
                        updateSection(si, { judgeGuidance: e.target.value })
                      }
                      placeholder="Instructions for judges scoring this section"
                    />
                  ) : null}
                </div>

                {itemMismatch ? (
                  <p className="text-sm text-amber-600">
                    Criteria total ({itemTotal}) does not match section max (
                    {section.maxSectionPoints}).
                  </p>
                ) : null}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Judging Criteria</p>
                    {!structureLocked ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const items = [
                            ...section.items,
                            {
                              clientKey: newClientKey(),
                              label: "New Criteria",
                              sortOrder: section.items.length,
                              maxPoints: 10,
                              judgeGuidance: "",
                              requiresCommentOnDeduction: false,
                              deductionOptions: [],
                            },
                          ];
                          updateSection(si, { items });
                        }}
                      >
                        <Plus className="mr-1 size-3" />
                        Add Criteria
                      </Button>
                    ) : null}
                  </div>

                  {section.items.map((item, ii) => (
                    <div
                      key={item.clientKey}
                      className="space-y-3 rounded-md border p-3"
                    >
                      <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
                        <div className="space-y-2">
                          <Label>Criteria Label</Label>
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
                          <Label>Max Points</Label>
                          <Input
                            type="number"
                            min={0}
                            value={item.maxPoints}
                            disabled={structureLocked}
                            onChange={(e) => {
                              const items = section.items.map((it, j) =>
                                j === ii
                                  ? {
                                      ...it,
                                      maxPoints: Math.max(
                                        0,
                                        parseInt(e.target.value, 10) || 0,
                                      ),
                                    }
                                  : it,
                              );
                              updateSection(si, { items });
                            }}
                          />
                        </div>
                      </div>

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
                        Comment required when deduction/low score entered
                      </label>

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
                          Judge Guidance {item.guidanceOpen ? "▾" : "▸"}
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
                          />
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Deduction Options</p>
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
                                const deductionOptions = item.deductionOptions.map(
                                  (d, k) =>
                                    k === oi ? { ...d, label: e.target.value } : d,
                                );
                                const items = section.items.map((it, j) =>
                                  j === ii ? { ...it, deductionOptions } : it,
                                );
                                updateSection(si, { items });
                              }}
                            />
                            <Input
                              type="number"
                              min={0}
                              value={opt.pointsDeducted}
                              disabled={structureLocked}
                              onChange={(e) => {
                                const deductionOptions = item.deductionOptions.map(
                                  (d, k) =>
                                    k === oi
                                      ? {
                                          ...d,
                                          pointsDeducted: Math.max(
                                            0,
                                            parseInt(e.target.value, 10) || 0,
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
                            Add Deduction
                          </Button>
                        ) : null}
                      </div>

                      {!structureLocked ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => {
                            const items = section.items.filter((_, j) => j !== ii);
                            updateSection(si, { items });
                          }}
                        >
                          Remove Criteria
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleCard>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Save Template
        </Button>
        <Button type="button" variant="outline" onClick={onTogglePreview}>
          {showPreview ? "Hide Preview" : "Preview Judge Form"}
        </Button>
      </div>

      {showPreview ? <ScoreSheetTemplatePreview draft={draft} /> : null}
    </div>
  );
}
