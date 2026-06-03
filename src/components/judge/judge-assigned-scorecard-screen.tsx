"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Info, Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { readResponseJson } from "@/lib/read-response-json";
import type { ScorecardItemDraftInput } from "@/lib/judging/judge-assigned-scorecard-validation";

type Detail = {
  sheet: {
    id: string;
    status: "DRAFT" | "SUBMITTED" | "FINALIZED";
    methodology: string;
    totalPoints: number;
    generalNotes: string | null;
    vehicleEntryCode: string;
  };
  vehicle: {
    year: number;
    make: string;
    model: string;
    trim: string | null;
    vin: string | null;
    nickname: string | null;
    vehicleStory: string | null;
    photoUrl: string | null;
    ownerName: string | null;
    vehicleClass: string;
  };
  sections: Array<{
    id: string;
    name: string;
    isAssigned: boolean;
    isEditable: boolean;
    assignmentStatus: string | null;
    judgeGuidance: string | null;
    maxSectionPoints: number | null;
    items: Array<{
      id: string;
      label: string;
      maxPoints: number;
      scoringType: string;
      allowMultipleViolations: boolean;
      judgeGuidance: string | null;
      requiresCommentOnDeduction: boolean;
      itemNotes: string | null;
      deductionOptions: Array<{ id: string; label: string; pointsDeducted: number }>;
      deductions: Array<{
        optionId: string | null;
        violationCount: number;
        discretionaryPoints: number | null;
      }>;
    }>;
  }>;
  calculated: { finalScore: number };
};

type ItemDraft = {
  discretionaryPoints: string;
  selectedOptionIds: string[];
  violationCounts: Record<string, string>;
  itemNotes: string;
  deductionComments: Record<string, string>;
};

function buildDraftMap(detail: Detail | null): Record<string, ItemDraft> {
  const out: Record<string, ItemDraft> = {};
  if (!detail) return out;
  for (const section of detail.sections) {
    for (const item of section.items) {
      const disc = item.deductions.find((d) => d.discretionaryPoints != null);
      const optionIds = item.deductions
        .map((d) => d.optionId)
        .filter((id): id is string => !!id);
      const violationCounts: Record<string, string> = {};
      for (const d of item.deductions) {
        if (d.optionId) {
          violationCounts[d.optionId] = String(d.violationCount ?? 1);
        }
      }
      out[item.id] = {
        discretionaryPoints:
          disc?.discretionaryPoints != null ? String(disc.discretionaryPoints) : "",
        selectedOptionIds: optionIds,
        violationCounts,
        itemNotes: item.itemNotes ?? "",
        deductionComments: {},
      };
    }
  }
  return out;
}

function itemsPayload(
  section: Detail["sections"][0],
  drafts: Record<string, ItemDraft>,
): ScorecardItemDraftInput[] {
  return section.items.map((item) => {
    const d = drafts[item.id]!;
    return {
      itemId: item.id,
      discretionaryPoints:
        d.discretionaryPoints.trim() === "" ? null : Number(d.discretionaryPoints),
      levelSelections: d.selectedOptionIds.map((optionId) => ({
        optionId,
        violationCount:
          item.allowMultipleViolations && d.violationCounts[optionId]
            ? Number(d.violationCounts[optionId])
            : 1,
      })),
      itemNotes: d.itemNotes,
      deductionComments: d.deductionComments,
    };
  });
}

function GuidanceModal({
  open,
  title,
  text,
  onClose,
}: {
  open: boolean;
  title: string;
  text: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative mx-2 mb-2 max-h-[70vh] w-full max-w-md overflow-y-auto rounded-xl border bg-background p-4 shadow-lg sm:mb-0">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{text}</p>
        <Button type="button" className="mt-4 w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

export function JudgeAssignedScorecardScreen({
  eventId,
  sheetId,
}: {
  eventId: string;
  sheetId: string;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [guidance, setGuidance] = useState<{ title: string; text: string } | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/judge/events/${eventId}/score-sheets/${sheetId}`, {
        credentials: "same-origin",
      });
      const parsed = await readResponseJson<Detail & { error?: string }>(res);
      if (!parsed.bodyIsJson || !parsed.data) {
        throw new Error(parsed.data?.error ?? "Failed to load score sheet.");
      }
      if (!res.ok) throw new Error(parsed.data.error ?? "Failed to load.");
      setDetail(parsed.data);
      setDrafts(buildDraftMap(parsed.data));
      setGeneralNotes(parsed.data.sheet.generalNotes ?? "");
      const first = parsed.data.sections[0]?.id ?? null;
      setActiveSectionId((prev) => prev ?? first);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [eventId, sheetId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const activeSection = useMemo(
    () => detail?.sections.find((s) => s.id === activeSectionId) ?? null,
    [detail, activeSectionId],
  );

  const readOnly = detail?.sheet.status !== "DRAFT";

  async function saveSection(forSubmit = false) {
    if (!detail || !activeSection?.isEditable) return;
    setBusy(true);
    setActionError("");
    setSavedMsg("");
    try {
      const body = {
        generalNotes,
        sectionIds: forSubmit
          ? detail.sections.filter((s) => s.isEditable).map((s) => s.id)
          : [activeSection.id],
        items: forSubmit
          ? detail.sections
              .filter((s) => s.isEditable)
              .flatMap((s) => itemsPayload(s, drafts))
          : itemsPayload(activeSection, drafts),
      };
      const url = forSubmit
        ? `/api/judge/events/${eventId}/score-sheets/${sheetId}/submit`
        : `/api/judge/events/${eventId}/score-sheets/${sheetId}`;
      const res = await fetch(url, {
        method: forSubmit ? "POST" : "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const parsed = await readResponseJson<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(parsed.data?.error ?? (forSubmit ? "Submit failed." : "Save failed."));
      }
      setSavedMsg(forSubmit ? "Submitted successfully." : "Saved for later.");
      await loadDetail();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  function toggleOption(itemId: string, optionId: string, scoringType: string) {
    if (readOnly) return;
    setDrafts((prev) => {
      const d = { ...prev[itemId]! };
      if (scoringType === "FULL") {
        d.selectedOptionIds = d.selectedOptionIds.includes(optionId) ? [] : [optionId];
      } else {
        const set = new Set(d.selectedOptionIds);
        if (set.has(optionId)) set.delete(optionId);
        else set.add(optionId);
        d.selectedOptionIds = [...set];
      }
      return { ...prev, [itemId]: d };
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (error || !detail) {
    return (
      <p className="text-sm text-destructive">{error || "Score sheet not found."}</p>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <Link
        href={`/judge/events/${eventId}/score-sheets`}
        className="text-sm text-muted-foreground underline"
      >
        Back to My Judging
      </Link>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-mono">{detail.sheet.vehicleEntryCode}</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 text-sm">
          {detail.vehicle.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={detail.vehicle.photoUrl}
              alt=""
              className="size-20 rounded-md object-cover"
            />
          ) : null}
          <div className="space-y-1">
            <p className="font-medium">
              {detail.vehicle.year} {detail.vehicle.make} {detail.vehicle.model}
              {detail.vehicle.trim ? ` ${detail.vehicle.trim}` : ""}
            </p>
            {detail.vehicle.vin ? (
              <p className="text-muted-foreground">VIN: {detail.vehicle.vin}</p>
            ) : null}
            {detail.vehicle.nickname ? <p>{detail.vehicle.nickname}</p> : null}
            {detail.vehicle.ownerName ? (
              <p className="text-muted-foreground">Owner: {detail.vehicle.ownerName}</p>
            ) : null}
            <p className="text-muted-foreground">{detail.vehicle.vehicleClass}</p>
            {detail.vehicle.vehicleStory ? (
              <p className="text-muted-foreground">{detail.vehicle.vehicleStory}</p>
            ) : null}
            <p className="font-medium text-primary">
              Score: {detail.calculated.finalScore.toFixed(1)} / {detail.sheet.totalPoints}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {detail.sections.map((section) => (
          <Button
            key={section.id}
            type="button"
            size="sm"
            variant={section.id === activeSectionId ? "default" : "outline"}
            className={cn("shrink-0", !section.isAssigned && "opacity-70")}
            onClick={() => setActiveSectionId(section.id)}
          >
            {section.name}
            {!section.isEditable ? (
              <span className="ml-1 text-[10px]">(view)</span>
            ) : null}
          </Button>
        ))}
      </div>

      {activeSection ? (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{activeSection.name}</CardTitle>
              {activeSection.isAssigned ? (
                <Badge variant="secondary">{activeSection.assignmentStatus ?? "Assigned"}</Badge>
              ) : (
                <Badge variant="outline">Read-only</Badge>
              )}
              {!activeSection.isEditable ? (
                <span className="text-xs text-muted-foreground">
                  Not assigned to you
                  {activeSection.assignmentStatus === "SUBMITTED" ? " · submitted" : ""}
                </span>
              ) : null}
            </div>
            {activeSection.judgeGuidance ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-primary underline"
                onClick={() =>
                  setGuidance({
                    title: activeSection.name,
                    text: activeSection.judgeGuidance!,
                  })
                }
              >
                <Info className="size-3" />
                Category guidance
              </button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSection.items.map((item) => {
              const d = drafts[item.id];
              const editable = activeSection.isEditable && !readOnly;
              return (
                <div key={item.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Label className="font-medium leading-snug">
                      {item.label}
                      <span className="ml-1 text-muted-foreground">(max {item.maxPoints})</span>
                    </Label>
                    {item.judgeGuidance ? (
                      <button
                        type="button"
                        aria-label="Guidance"
                        onClick={() =>
                          setGuidance({ title: item.label, text: item.judgeGuidance! })
                        }
                      >
                        <Info className="size-4 text-primary" />
                      </button>
                    ) : null}
                  </div>

                  {item.scoringType === "DISCRETIONARY" ? (
                    <div>
                      <Label htmlFor={`disc-${item.id}`} className="text-xs">
                        Deduction (0–{item.maxPoints})
                      </Label>
                      <Input
                        id={`disc-${item.id}`}
                        type="number"
                        min={0}
                        max={item.maxPoints}
                        disabled={!editable}
                        value={d?.discretionaryPoints ?? ""}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.id]: { ...prev[item.id]!, discretionaryPoints: e.target.value },
                          }))
                        }
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {item.deductionOptions.map((opt) => {
                        const selected = d?.selectedOptionIds.includes(opt.id) ?? false;
                        return (
                          <div key={opt.id} className="space-y-1">
                            <Button
                              type="button"
                              variant={selected ? "default" : "outline"}
                              size="sm"
                              disabled={!editable}
                              className="w-full justify-start"
                              onClick={() =>
                                toggleOption(item.id, opt.id, item.scoringType)
                              }
                            >
                              {item.scoringType === "FULL" ? "Select" : opt.label} (−
                              {opt.pointsDeducted})
                            </Button>
                            {selected && item.allowMultipleViolations ? (
                              <div className="pl-2">
                                <Label className="text-xs">Count</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  disabled={!editable}
                                  value={d?.violationCounts[opt.id] ?? "1"}
                                  onChange={(e) =>
                                    setDrafts((prev) => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id]!,
                                        violationCounts: {
                                          ...prev[item.id]!.violationCounts,
                                          [opt.id]: e.target.value,
                                        },
                                      },
                                    }))
                                  }
                                />
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(item.requiresCommentOnDeduction ||
                    item.scoringType === "DISCRETIONARY") && (
                    <div>
                      <Label className="text-xs">Remarks</Label>
                      <Textarea
                        rows={2}
                        disabled={!editable}
                        value={d?.itemNotes ?? ""}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.id]: { ...prev[item.id]!, itemNotes: e.target.value },
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <div>
        <Label htmlFor="general-notes">General notes</Label>
        <Textarea
          id="general-notes"
          rows={3}
          disabled={readOnly}
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
        />
      </div>

      {actionError ? (
        <p className="text-sm text-destructive">{actionError}</p>
      ) : null}
      {savedMsg ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">{savedMsg}</p>
      ) : null}

      {!readOnly ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-lg gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={busy || !activeSection?.isEditable}
              onClick={() => void saveSection(false)}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save for later
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={busy}
              onClick={() => void saveSection(true)}
            >
              Submit
            </Button>
          </div>
        </div>
      ) : null}

      <GuidanceModal
        open={!!guidance}
        title={guidance?.title ?? ""}
        text={guidance?.text ?? ""}
        onClose={() => setGuidance(null)}
      />
    </div>
  );
}
