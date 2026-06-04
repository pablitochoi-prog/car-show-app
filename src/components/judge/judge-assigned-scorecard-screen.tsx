"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Info, Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  JudgeScorecardItemRow,
  type ScorecardItemDraft,
} from "@/components/judge/judge-scorecard-item-row";
import { cn } from "@/lib/utils";
import { readResponseJson } from "@/lib/read-response-json";
import { itemDraftMissingRequiredComment } from "@/lib/judging/scorecard-required-comment";
import type { ScorecardItemDraftInput } from "@/lib/judging/judge-assigned-scorecard-validation";
import { computeSectionDeductionSummary } from "@/lib/judging/judge-scorecard-line-deduction";
import type { JudgingMethodology } from "@prisma/client";

function formatPts(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function shortItemLabel(label: string, max = 48): string {
  const t = label.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function collectMissingRequiredNoteLabels(
  sections: Detail["sections"],
  drafts: Record<string, ScorecardItemDraft>,
  options?: { sectionId?: string; editableOnly?: boolean },
): string[] {
  const labels: string[] = [];
  for (const section of sections) {
    if (options?.sectionId && section.id !== options.sectionId) continue;
    if (options?.editableOnly && !section.isEditable) continue;
    for (const item of section.items) {
      const draft = drafts[item.id];
      if (!draft) continue;
      if (itemDraftMissingRequiredComment(item, draft)) {
        labels.push(shortItemLabel(item.label));
      }
    }
  }
  return labels;
}

function formatMissingNotesMessage(labels: string[]): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) {
    return `Add a note for “${labels[0]}” before submitting.`;
  }
  const preview = labels.slice(0, 3).map((l) => `“${l}”`).join(", ");
  const more = labels.length > 3 ? ` and ${labels.length - 3} more` : "";
  return `Add notes for ${labels.length} subcategories (${preview}${more}) before submitting.`;
}

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
    eventJudgingSectionId: string | null;
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

function buildDraftMap(detail: Detail | null): Record<string, ScorecardItemDraft> {
  const out: Record<string, ScorecardItemDraft> = {};
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
      };
    }
  }
  return out;
}

function itemsPayload(
  section: Detail["sections"][0],
  drafts: Record<string, ScorecardItemDraft>,
): ScorecardItemDraftInput[] {
  return section.items.flatMap((item) => {
    const d = drafts[item.id];
    if (!d) return [];
    return [{
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
      deductionComments: Object.fromEntries(
        d.selectedOptionIds.map((optionId) => [optionId, d.itemNotes]),
      ),
    }];
  });
}

function resolveInitialSectionId(
  sections: Detail["sections"],
  querySection: string | null,
  preserveId: string | null,
): string | null {
  if (preserveId && sections.some((s) => s.id === preserveId)) return preserveId;
  if (querySection) {
    const match = sections.find(
      (s) =>
        s.id === querySection ||
        (s.eventJudgingSectionId != null && s.eventJudgingSectionId === querySection),
    );
    if (match) return match.id;
  }
  const assigned = sections.filter((s) => s.isAssigned);
  const pending = assigned.find(
    (s) =>
      s.assignmentStatus === "NOT_JUDGED" ||
      s.assignmentStatus === "SAVED_FOR_LATER",
  );
  return pending?.id ?? assigned[0]?.id ?? sections[0]?.id ?? null;
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ScorecardItemDraft>>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitNoteHint, setSubmitNoteHint] = useState("");
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
      const loaded = parsed.data;
      setDetail(loaded);
      setDrafts(buildDraftMap(loaded));
      setGeneralNotes(loaded.sheet.generalNotes ?? "");
      const querySection = searchParams.get("section");
      setActiveSectionId((prev) =>
        resolveInitialSectionId(loaded.sections, querySection, prev),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [eventId, sheetId, searchParams]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const activeSection = useMemo(
    () => detail?.sections.find((s) => s.id === activeSectionId) ?? null,
    [detail, activeSectionId],
  );

  const sectionSummaries = useMemo(() => {
    if (!detail) {
      return new Map<string, ReturnType<typeof computeSectionDeductionSummary>>();
    }
    const methodology = detail.sheet.methodology as JudgingMethodology;
    const map = new Map<string, ReturnType<typeof computeSectionDeductionSummary>>();
    for (const section of detail.sections) {
      map.set(
        section.id,
        computeSectionDeductionSummary(
          section.items,
          drafts,
          methodology,
          section.maxSectionPoints,
        ),
      );
    }
    return map;
  }, [detail, drafts]);

  const activeSummary = activeSectionId
    ? sectionSummaries.get(activeSectionId)
    : null;

  const submitMissingNotes = useMemo(() => {
    if (!detail) return [];
    return collectMissingRequiredNoteLabels(detail.sections, drafts, {
      editableOnly: true,
    });
  }, [detail, drafts]);

  const footerMessage = actionError || submitNoteHint;

  useEffect(() => {
    if (submitMissingNotes.length === 0) {
      setSubmitNoteHint("");
    }
  }, [submitMissingNotes.length]);

  const readOnly = detail?.sheet.status !== "DRAFT";

  async function saveSection(forSubmit = false) {
    if (!detail) return;
    if (!forSubmit) {
      if (!activeSection?.isEditable) {
        setActionError(
          activeSection?.isAssigned
            ? "This category is read-only."
            : "This category is not assigned to you.",
        );
        return;
      }
      if (!activeSection) return;
    }
    if (forSubmit && !detail.sections.some((s) => s.isEditable)) {
      setActionError("No assigned categories are available to submit.");
      return;
    }
    const sectionForSave = forSubmit ? null : activeSection;
    if (!forSubmit && !sectionForSave) return;

    if (forSubmit) {
      const missing = collectMissingRequiredNoteLabels(detail.sections, drafts, {
        editableOnly: true,
      });
      if (missing.length > 0) {
        setActionError("");
        setSubmitNoteHint(formatMissingNotesMessage(missing));
        return;
      }
    }

    setBusy(true);
    setActionError("");
    setSubmitNoteHint("");
    setSavedMsg("");
    try {
      const body = {
        generalNotes,
        sectionIds: forSubmit
          ? detail.sections.filter((s) => s.isEditable).map((s) => s.id)
          : [sectionForSave!.id],
        items: forSubmit
          ? detail.sections
              .filter((s) => s.isEditable)
              .flatMap((s) => itemsPayload(s, drafts))
          : itemsPayload(sectionForSave!, drafts),
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
      const parsed = await readResponseJson<{
        ok?: boolean;
        error?: string;
        code?: string;
      }>(res);
      const apiMessage =
        parsed.data?.error?.trim() ||
        parsed.rawPreview?.trim() ||
        null;
      if (!res.ok) {
        throw new Error(
          apiMessage ??
            (forSubmit
              ? "Submit failed. Check the server log for details."
              : "Save failed. Check the server log for details."),
        );
      }
      if (!parsed.bodyIsJson || !parsed.data) {
        throw new Error(forSubmit ? "Submit failed." : "Save failed.");
      }
      if (parsed.data.error) {
        throw new Error(parsed.data.error);
      }
      if (parsed.data.ok !== true) {
        throw new Error(forSubmit ? "Submit failed." : "Save failed.");
      }
      router.replace(`/judge/events/${eventId}/score-sheets`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Request failed.";
      setActionError(message);
      if (
        message.toLowerCase().includes("note") ||
        message.toLowerCase().includes("comment") ||
        message.toLowerCase().includes("remark")
      ) {
        setSubmitNoteHint(formatMissingNotesMessage(submitMissingNotes));
      }
    } finally {
      setBusy(false);
    }
  }

  function toggleOption(
    itemId: string,
    optionId: string,
    scoringType: string,
  ) {
    if (readOnly) return;
    setDrafts((prev) => {
      const d = { ...prev[itemId]! };
      if (scoringType === "FULL" || scoringType === "LEVELS") {
        d.selectedOptionIds = d.selectedOptionIds.includes(optionId)
          ? []
          : [optionId];
      } else {
        const next = new Set(d.selectedOptionIds);
        if (next.has(optionId)) next.delete(optionId);
        else next.add(optionId);
        d.selectedOptionIds = [...next];
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
    <div className={cn("space-y-4", !readOnly ? "pb-44" : "pb-6")}>
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

      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-emerald-700 dark:text-emerald-400">
          Green
        </span>{" "}
        = assigned to you ·{" "}
        <span className="font-medium text-pink-700 dark:text-pink-400">Pink</span>{" "}
        = not assigned (view only)
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {detail.sections.map((section) => {
          const active = section.id === activeSectionId;
          const assigned = section.isAssigned;
          const tabDeductions = sectionSummaries.get(section.id)?.totalDeductions ?? 0;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSectionId(section.id)}
              className={cn(
                "flex shrink-0 flex-col items-center rounded-lg border-2 px-3 py-2 text-left transition-colors",
                assigned
                  ? active
                    ? "border-emerald-600 bg-emerald-100 dark:border-emerald-500 dark:bg-emerald-950/60"
                    : "border-emerald-300 bg-emerald-50 hover:bg-emerald-100/80 dark:border-emerald-800 dark:bg-emerald-950/30"
                  : active
                    ? "border-pink-500 bg-pink-100 dark:border-pink-500 dark:bg-pink-950/50"
                    : "border-pink-300 bg-pink-50 hover:bg-pink-100/80 dark:border-pink-900 dark:bg-pink-950/25",
              )}
            >
              <span
                className={cn(
                  "text-sm font-semibold leading-tight",
                  assigned
                    ? "text-emerald-950 dark:text-emerald-50"
                    : "text-pink-950 dark:text-pink-50",
                )}
              >
                {section.name}
              </span>
              <span
                className={cn(
                  "mt-0.5 text-[10px] font-bold tabular-nums",
                  tabDeductions > 0
                    ? "text-destructive"
                    : assigned
                      ? "text-emerald-800 dark:text-emerald-300"
                      : "text-pink-800 dark:text-pink-300",
                )}
              >
                {tabDeductions > 0 ? `−${formatPts(tabDeductions)} pts` : "0 pts"}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium uppercase tracking-wide",
                  assigned
                    ? "text-emerald-800/80 dark:text-emerald-300/80"
                    : "text-pink-800/80 dark:text-pink-300/80",
                )}
              >
                {assigned ? "Assigned" : "Not assigned"}
              </span>
            </button>
          );
        })}
      </div>

      {activeSection && activeSummary ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm",
            activeSection.isAssigned
              ? "border-emerald-300 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/40"
              : "border-pink-300 bg-pink-50/80 dark:border-pink-900 dark:bg-pink-950/40",
          )}
        >
          <span className="font-semibold">{activeSection.name}</span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 tabular-nums">
            <span>
              <span className="text-muted-foreground">Deductions: </span>
              <span
                className={cn(
                  "font-bold",
                  activeSummary.totalDeductions > 0
                    ? "text-destructive"
                    : "text-foreground",
                )}
              >
                −{formatPts(activeSummary.totalDeductions)} pts
              </span>
            </span>
            <span>
              <span className="text-muted-foreground">Category score: </span>
              <span className="font-bold text-primary">
                {formatPts(activeSummary.sectionScore)} / {formatPts(activeSummary.sectionMax)}
              </span>
            </span>
          </div>
        </div>
      ) : null}

      {activeSection ? (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{activeSection.name}</CardTitle>
              <Badge
                className={cn(
                  activeSection.isAssigned
                    ? "border-emerald-600 bg-emerald-100 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-100"
                    : "border-pink-500 bg-pink-100 text-pink-900 hover:bg-pink-100 dark:bg-pink-950 dark:text-pink-100",
                )}
              >
                {activeSection.isAssigned ? "Assigned to you" : "Not assigned"}
              </Badge>
              {activeSection.isAssigned && activeSection.assignmentStatus ? (
                <Badge variant="secondary">{activeSection.assignmentStatus}</Badge>
              ) : null}
              {!activeSection.isEditable ? (
                <span className="text-xs text-muted-foreground">
                  {activeSection.isAssigned
                    ? activeSection.assignmentStatus === "SUBMITTED"
                      ? "Submitted — read-only"
                      : "Read-only"
                    : "View only — another judge handles this category"}
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
          <CardContent className="px-3 pb-3 pt-1">
            <div className="mb-1 hidden gap-2 border-b pb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
              <span>Subcategory</span>
              <span className="min-w-[12rem] text-center">Score</span>
              <span className="w-[3.25rem] text-center">Ded</span>
              <span className="w-11 text-center" aria-hidden>
                Note
              </span>
            </div>
            {activeSection.items.map((item, itemIndex, items) => {
              const d = drafts[item.id];
              if (!d) return null;
              const editable = activeSection.isEditable && !readOnly;
              return (
                <JudgeScorecardItemRow
                  key={item.id}
                  item={item}
                  draft={d}
                  methodology={
                    detail.sheet.methodology as "DEDUCTION" | "ADDITIVE" | "ORIGINALITY_CONDITION"
                  }
                  editable={editable}
                  isLast={itemIndex === items.length - 1}
                  onDraftChange={(next) =>
                    setDrafts((prev) => ({ ...prev, [item.id]: next }))
                  }
                  onShowGuidance={(title, text) => setGuidance({ title, text })}
                  onToggleOption={(optionId) =>
                    toggleOption(item.id, optionId, item.scoringType)
                  }
                />
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="general-notes" className="shrink-0 text-sm">
          General notes
        </Label>
        <Textarea
          id="general-notes"
          rows={2}
          disabled={readOnly}
          className="min-h-0 flex-1 text-sm"
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
        />
      </div>

      {savedMsg ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">{savedMsg}</p>
      ) : null}

      {!readOnly ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 p-3 backdrop-blur">
          <div className="mx-auto max-w-lg space-y-2">
            {activeSection && activeSummary ? (
              <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                <p className="font-medium">{activeSection.name} subtotal</p>
                <div className="mt-1 flex flex-wrap justify-between gap-x-4 tabular-nums">
                  <span>
                    <span className="text-muted-foreground">Total deductions </span>
                    <span
                      className={cn(
                        "font-bold",
                        activeSummary.totalDeductions > 0
                          ? "text-destructive"
                          : "text-foreground",
                      )}
                    >
                      −{formatPts(activeSummary.totalDeductions)} pts
                    </span>
                  </span>
                  <span>
                    <span className="text-muted-foreground">Score </span>
                    <span className="font-bold">
                      {formatPts(activeSummary.sectionScore)} /{" "}
                      {formatPts(activeSummary.sectionMax)}
                    </span>
                  </span>
                </div>
              </div>
            ) : null}
            <div className="flex gap-2">
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
            {footerMessage ? (
              <p
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {footerMessage}
              </p>
            ) : submitMissingNotes.length > 0 ? (
              <p className="text-xs text-muted-foreground" role="status">
                Red note buttons: add required notes before you submit.
              </p>
            ) : null}
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
