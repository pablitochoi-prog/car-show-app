"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calculateScoreSheetScore, type CalculateScoreInput } from "@/lib/judging/calculate-score";
import {
  collectDeductionCommentFieldErrors,
  DEDUCTION_COMMENT_REQUIRED_MESSAGE,
} from "@/lib/judging/judge-score-sheet-draft-validation";
import { readResponseJson } from "@/lib/read-response-json";

type SaveState = "idle" | "saving" | "saved" | "error";

type SheetDetail = {
  sheet: {
    id: string;
    status: "DRAFT" | "SUBMITTED" | "FINALIZED";
    methodology: "DEDUCTION" | "ADDITIVE" | "ORIGINALITY_CONDITION";
    totalPoints: number;
    generalNotes: string | null;
    sections: Array<{
      id: string;
      name: string;
      judgeGuidance: string | null;
      weightPercent: number | null;
      maxSectionPoints: number | null;
      items: Array<{
        id: string;
        label: string;
        maxPoints: number;
        judgeGuidance: string | null;
        requiresCommentOnDeduction: boolean;
        awardedPoints: number | null;
        itemNotes: string | null;
        deductionOptions: Array<{
          id: string;
          label: string;
          pointsDeducted: number;
          deductionBucket: "ORIGINALITY" | "CONDITION" | null;
        }>;
        deductions: Array<{
          id: string;
          optionId: string | null;
          comment: string | null;
        }>;
      }>;
    }>;
    eventJudgingClass: { id: string; name: string } | null;
    vehicleEntryCode: string;
  };
  calculated: {
    finalScore: number;
    originalityDeductions: number;
    conditionDeductions: number;
    sectionScores: number[];
  };
};

type ItemDraftState = {
  awardedPoints: string;
  itemNotes: string;
  selectedOptionIds: string[];
  deductionComments: Record<string, string>;
};

function buildItemsPayload(itemDraft: Record<string, ItemDraftState>) {
  return Object.entries(itemDraft).map(([itemId, draft]) => ({
    itemId,
    awardedPoints: draft.awardedPoints.trim() === "" ? null : Number(draft.awardedPoints),
    itemNotes: draft.itemNotes,
    deductionOptionIds: draft.selectedOptionIds,
    deductionComments: draft.deductionComments,
  }));
}

function describeApiFailure(
  fallback: string,
  parsed: Awaited<ReturnType<typeof readResponseJson<{ error?: string }>>>,
): string {
  if (parsed.bodyIsJson && parsed.data?.error) return parsed.data.error;
  if (!parsed.bodyIsJson) {
    return `${fallback} (unexpected server response, status ${parsed.status}).`;
  }
  return fallback;
}

function buildDraftMap(detail: SheetDetail | null): Record<string, ItemDraftState> {
  const out: Record<string, ItemDraftState> = {};
  if (!detail) return out;
  for (const section of detail.sheet.sections) {
    for (const item of section.items) {
      out[item.id] = {
        awardedPoints: item.awardedPoints != null ? String(item.awardedPoints) : "",
        itemNotes: item.itemNotes ?? "",
        selectedOptionIds: item.deductions
          .map((d) => d.optionId)
          .filter((id): id is string => !!id),
        deductionComments: Object.fromEntries(
          item.deductions
            .filter((d) => d.optionId)
            .map((d) => [String(d.optionId), d.comment ?? ""]),
        ),
      };
    }
  }
  return out;
}

export function JudgeScoreSheetScreen({
  eventId,
  sheetId,
}: {
  eventId: string;
  sheetId: string;
}) {
  const [detail, setDetail] = useState<SheetDetail | null>(null);
  const [itemDraft, setItemDraft] = useState<Record<string, ItemDraftState>>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [actionError, setActionError] = useState("");
  const [commentFieldErrors, setCommentFieldErrors] = useState<
    Record<string, Record<string, string>>
  >({});

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/judge/events/${eventId}/score-sheets/${sheetId}`, {
        credentials: "same-origin",
      });
      const parsed = await readResponseJson<SheetDetail & { error?: string }>(res);
      if (!parsed.bodyIsJson || !parsed.data) {
        throw new Error(describeApiFailure("Failed to load score sheet.", parsed));
      }
      if (!res.ok) throw new Error(parsed.data.error ?? "Failed to load score sheet.");
      setDetail(parsed.data);
      setItemDraft(buildDraftMap(parsed.data));
      setGeneralNotes(parsed.data.sheet.generalNotes ?? "");
      setCommentFieldErrors({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [eventId, sheetId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const liveScore = useMemo(() => {
    if (!detail) return null;
    const input: CalculateScoreInput = {
      methodology: detail.sheet.methodology,
      totalPoints: detail.sheet.totalPoints,
      sections: detail.sheet.sections.map((section) => ({
        weightPercent: section.weightPercent,
        maxSectionPoints: section.maxSectionPoints,
        items: section.items.map((item) => {
          const draft = itemDraft[item.id];
          const options = item.deductionOptions.filter((opt) =>
            draft?.selectedOptionIds.includes(opt.id),
          );
          return {
            maxPoints: item.maxPoints,
            awardedPoints:
              draft?.awardedPoints.trim() === ""
                ? null
                : Number(draft?.awardedPoints ?? 0),
            deductions: options.map((opt) => ({
              pointsDeducted: opt.pointsDeducted,
              deductionBucket: opt.deductionBucket,
            })),
          };
        }),
      })),
    };
    return calculateScoreSheetScore(input);
  }, [detail, itemDraft]);

  async function saveDraft(): Promise<boolean> {
    if (!detail || detail.sheet.status !== "DRAFT") return false;
    const items = buildItemsPayload(itemDraft);
    const fieldErrors = collectDeductionCommentFieldErrors(detail.sheet, items);
    if (Object.keys(fieldErrors).length > 0) {
      setCommentFieldErrors(fieldErrors);
      setSaveState("error");
      setActionError(DEDUCTION_COMMENT_REQUIRED_MESSAGE);
      return false;
    }

    setSaveState("saving");
    setActionError("");
    setCommentFieldErrors({});
    try {
      const res = await fetch(`/api/judge/events/${eventId}/score-sheets/${sheetId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generalNotes, items }),
      });
      const parsed = await readResponseJson<{ error?: string }>(res);
      if (!parsed.bodyIsJson || !parsed.data) {
        throw new Error(describeApiFailure("Could not save draft.", parsed));
      }
      if (!res.ok) throw new Error(parsed.data.error ?? "Could not save draft.");
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
      await loadDetail();
      return true;
    } catch (e) {
      setSaveState("error");
      setActionError(e instanceof Error ? e.message : "Could not save draft.");
      return false;
    }
  }

  async function submitSheet() {
    if (!detail || detail.sheet.status !== "DRAFT") return;
    const saved = await saveDraft();
    if (!saved) return;
    setSaveState("saving");
    setActionError("");
    try {
      const res = await fetch(
        `/api/judge/events/${eventId}/score-sheets/${sheetId}/submit`,
        {
          method: "POST",
          credentials: "same-origin",
        },
      );
      const parsed = await readResponseJson<{ error?: string }>(res);
      if (!parsed.bodyIsJson || !parsed.data) {
        throw new Error(describeApiFailure("Could not submit score sheet.", parsed));
      }
      if (!res.ok) throw new Error(parsed.data.error ?? "Could not submit score sheet.");
      setSaveState("saved");
      await loadDetail();
    } catch (e) {
      setSaveState("error");
      setActionError(e instanceof Error ? e.message : "Could not submit score sheet.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        Loading score sheet…
      </div>
    );
  }
  if (error || !detail) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error || "Score sheet not found."}
      </p>
    );
  }

  const readOnly = detail.sheet.status !== "DRAFT";

  return (
    <div className="space-y-4 pb-32">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {detail.sheet.eventJudgingClass?.name ?? "Score Sheet"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {detail.sheet.vehicleEntryCode} · {detail.sheet.methodology.replaceAll("_", " ")}
          </p>
          {readOnly ? (
            <p className="text-sm text-primary">
              This score sheet is {detail.sheet.status.toLowerCase()} and read-only.
            </p>
          ) : null}
        </CardHeader>
      </Card>

      {detail.sheet.sections.map((section, sectionIndex) => (
        <Card key={section.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {sectionIndex + 1}. {section.name}
            </CardTitle>
            {section.judgeGuidance ? (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer py-1">Judge guidance</summary>
                <p className="pt-1">{section.judgeGuidance}</p>
              </details>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {section.items.map((item) => {
              const draft = itemDraft[item.id];
              if (!draft) return null;
              return (
                <div key={item.id} className="rounded-md border p-3">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">Max {item.maxPoints} pts</p>
                  {item.judgeGuidance ? (
                    <details className="mt-2 text-xs text-muted-foreground">
                      <summary className="cursor-pointer py-1">Item guidance</summary>
                      <p className="pt-1">{item.judgeGuidance}</p>
                    </details>
                  ) : null}

                  {detail.sheet.methodology === "ADDITIVE" ? (
                    <div className="mt-3 space-y-1">
                      <Label htmlFor={`points-${item.id}`}>Awarded points</Label>
                      <Input
                        id={`points-${item.id}`}
                        type="number"
                        min={0}
                        max={item.maxPoints}
                        disabled={readOnly}
                        value={draft.awardedPoints}
                        onChange={(e) =>
                          setItemDraft((prev) => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], awardedPoints: e.target.value },
                          }))
                        }
                        className="h-12 text-lg"
                      />
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium">Deductions</p>
                      {item.deductionOptions.map((option) => {
                        const selected = draft.selectedOptionIds.includes(option.id);
                        return (
                          <label
                            key={option.id}
                            className="block rounded-md border p-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              className="mr-2"
                              disabled={readOnly}
                              checked={selected}
                              onChange={(e) =>
                                setItemDraft((prev) => {
                                  const current = prev[item.id];
                                  const selectedSet = new Set(current.selectedOptionIds);
                                  if (e.target.checked) selectedSet.add(option.id);
                                  else selectedSet.delete(option.id);
                                  return {
                                    ...prev,
                                    [item.id]: {
                                      ...current,
                                      selectedOptionIds: Array.from(selectedSet),
                                    },
                                  };
                                })
                              }
                            />
                            {option.label} (-{option.pointsDeducted})
                            {detail.sheet.methodology === "ORIGINALITY_CONDITION" &&
                            option.deductionBucket
                              ? ` · ${option.deductionBucket.toLowerCase()}`
                              : ""}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {draft.selectedOptionIds.map((optionId) => (
                    <div key={`${item.id}:${optionId}`} className="mt-2 space-y-1">
                      <Label htmlFor={`comment-${item.id}-${optionId}`}>
                        Deduction comment
                        {item.requiresCommentOnDeduction ? " *" : ""}
                      </Label>
                      <Textarea
                        id={`comment-${item.id}-${optionId}`}
                        disabled={readOnly}
                        value={draft.deductionComments[optionId] ?? ""}
                        onChange={(e) =>
                          setItemDraft((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              deductionComments: {
                                ...prev[item.id].deductionComments,
                                [optionId]: e.target.value,
                              },
                            },
                          }))
                        }
                      />
                      {commentFieldErrors[item.id]?.[optionId] ? (
                        <p className="text-xs text-destructive">
                          {commentFieldErrors[item.id][optionId]}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">General notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={generalNotes}
            disabled={readOnly}
            onChange={(e) => setGeneralNotes(e.target.value)}
          />
        </CardContent>
      </Card>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div>
            <p className="text-lg font-bold tabular-nums text-primary">
              {(liveScore?.finalScore ?? detail.calculated.finalScore).toFixed(1)} /{" "}
              {detail.sheet.totalPoints}
            </p>
            <p className="text-xs text-muted-foreground">
              {saveState === "saving"
                ? "Saving…"
                : saveState === "saved"
                  ? "Saved"
                  : readOnly
                    ? "Read-only"
                    : "Draft"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={readOnly || saveState === "saving"}
              onClick={() => void saveDraft()}
            >
              <Save className="mr-2 size-4" />
              Save
            </Button>
            <Button
              type="button"
              className="h-11"
              disabled={readOnly || saveState === "saving"}
              onClick={() => void submitSheet()}
            >
              Submit
            </Button>
          </div>
        </div>
        {actionError ? (
          <p className="mx-auto mt-2 max-w-lg text-sm text-destructive">{actionError}</p>
        ) : null}
      </footer>
    </div>
  );
}
