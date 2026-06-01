"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreSheetTemplateEditor } from "@/components/organizer/awards-judging/score-sheet-template-editor";
import { EventJudgingClassPanel } from "@/components/organizer/awards-judging/event-judging-class-panel";
import {
  toStructurePayload,
  type EditLockInfo,
  type EventTemplateSummary,
  type JudgingClassRow,
  type SourceTemplate,
  type TemplateDraft,
  type ValidationWarning,
  type VehicleClassOption,
} from "@/components/organizer/awards-judging/score-sheet-types";

function apiTemplateToDraft(
  template: {
    name: string;
    description: string | null;
    methodology: string;
    totalPoints: number;
    sections: {
      id: string;
      name: string;
      sortOrder: number;
      weightPercent: number | null;
      maxSectionPoints: number | null;
      judgeGuidance: string | null;
      items: {
        id: string;
        label: string;
        sortOrder: number;
        maxPoints: number;
        judgeGuidance: string | null;
        requiresCommentOnDeduction: boolean;
        deductionOptions: {
          id: string;
          label: string;
          pointsDeducted: number;
          sortOrder: number;
          deductionBucket: "ORIGINALITY" | "CONDITION" | null;
        }[];
      }[];
    }[];
  },
): TemplateDraft {
  return {
    name: template.name,
    description: template.description ?? "",
    totalPoints: template.totalPoints,
    methodology: template.methodology,
    sections: template.sections.map((section) => ({
      clientKey: section.id,
      name: section.name,
      sortOrder: section.sortOrder,
      weightPercent:
        section.weightPercent != null ? String(section.weightPercent) : "",
      maxSectionPoints:
        section.maxSectionPoints != null ? String(section.maxSectionPoints) : "",
      judgeGuidance: section.judgeGuidance ?? "",
      items: section.items.map((item) => ({
        clientKey: item.id,
        label: item.label,
        sortOrder: item.sortOrder,
        maxPoints: item.maxPoints,
        judgeGuidance: item.judgeGuidance ?? "",
        requiresCommentOnDeduction: item.requiresCommentOnDeduction,
        deductionOptions: item.deductionOptions.map((opt) => ({
          clientKey: opt.id,
          label: opt.label,
          pointsDeducted: opt.pointsDeducted,
          sortOrder: opt.sortOrder,
          deductionBucket: opt.deductionBucket,
        })),
      })),
    })),
  };
}

export function ScoreSheetJudgingAdmin({
  eventId,
  vehicleClasses,
}: {
  eventId: string;
  vehicleClasses: VehicleClassOption[];
}) {
  const [templates, setTemplates] = useState<EventTemplateSummary[]>([]);
  const [sourceTemplates, setSourceTemplates] = useState<SourceTemplate[]>([]);
  const [judgingClasses, setJudgingClasses] = useState<JudgingClassRow[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TemplateDraft | null>(null);
  const [editLockInfo, setEditLockInfo] = useState<EditLockInfo | null>(null);
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClonePicker, setShowClonePicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const loadLists = useCallback(async () => {
    const [tplRes, srcRes, classRes] = await Promise.all([
      fetch(`/api/events/${eventId}/judging-templates`),
      fetch(`/api/events/${eventId}/judging-templates/source`),
      fetch(`/api/events/${eventId}/judging-classes`),
    ]);
    const tplData = await tplRes.json();
    const srcData = await srcRes.json();
    const classData = await classRes.json();
    setTemplates(tplData.templates ?? []);
    setSourceTemplates(srcData.templates ?? []);
    setJudgingClasses(classData.classes ?? []);
  }, [eventId]);

  const loadTemplateDetail = useCallback(
    async (templateId: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/events/${eventId}/judging-templates/${templateId}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load template.");
        setDraft(apiTemplateToDraft(data.template));
        setEditLockInfo(data.editLockInfo);
        setWarnings(data.warnings ?? []);
        setSelectedTemplateId(templateId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load failed.");
      } finally {
        setLoading(false);
      }
    },
    [eventId],
  );

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await loadLists();
      setLoading(false);
    })();
  }, [loadLists]);

  async function handleClone(sourceTemplateId: string, sourceName: string) {
    setCloning(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/judging-templates/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceTemplateId,
          name: `${sourceName} — Event Copy`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Clone failed.");
      await loadLists();
      setShowClonePicker(false);
      await loadTemplateDetail(data.eventTemplateId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clone failed.");
    } finally {
      setCloning(false);
    }
  }

  async function handleSave() {
    if (!selectedTemplateId || !draft || !editLockInfo) return;
    setSaving(true);
    setError(null);
    try {
      const metaRes = await fetch(
        `/api/events/${eventId}/judging-templates/${selectedTemplateId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draft.name.trim(),
            description: draft.description.trim() || null,
            ...(editLockInfo.canEditStructure
              ? { totalPoints: draft.totalPoints }
              : {}),
          }),
        },
      );
      const metaData = await metaRes.json();
      if (!metaRes.ok) throw new Error(metaData.error ?? "Metadata save failed.");

      let structData = metaData;
      if (editLockInfo.canEditStructure) {
        const structRes = await fetch(
          `/api/events/${eventId}/judging-templates/${selectedTemplateId}/structure`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(toStructurePayload(draft)),
          },
        );
        structData = await structRes.json();
        if (!structRes.ok) {
          throw new Error(structData.error ?? "Structure save failed.");
        }
      } else if (editLockInfo.canEditGuidance) {
        const guidanceRes = await fetch(
          `/api/events/${eventId}/judging-templates/${selectedTemplateId}/guidance`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sections: draft.sections.map((section) => ({
                id: section.clientKey,
                judgeGuidance: section.judgeGuidance.trim() || null,
                items: section.items.map((item) => ({
                  id: item.clientKey,
                  judgeGuidance: item.judgeGuidance.trim() || null,
                })),
              })),
            }),
          },
        );
        structData = await guidanceRes.json();
        if (!guidanceRes.ok) {
          throw new Error(structData.error ?? "Guidance save failed.");
        }
      }

      setDraft(apiTemplateToDraft(structData.template));
      setEditLockInfo(structData.editLockInfo);
      setWarnings(structData.warnings ?? structData.saveWarnings ?? []);
      await loadLists();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !draft) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="size-5" />
            Score Sheet Templates
          </CardTitle>
          <CardDescription>
            Clone a global template, customize sections and criteria, then map judging
            classes below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {templates.length > 0 ? (
            <div className="space-y-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => void loadTemplateDetail(t.id)}
                  className={`flex w-full items-start justify-between rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent/40 ${
                    selectedTemplateId === t.id ? "border-primary bg-accent/30" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-muted-foreground">
                      {t.totalPoints} pts · {t._count.sections} sections ·{" "}
                      {t._count.scoreSheets} score sheet
                      {t._count.scoreSheets === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Badge variant="outline">{t.editLock.replace(/_/g, " ")}</Badge>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No event score sheet templates yet. Start from a global template.
            </p>
          )}

          {showClonePicker ? (
            <div className="space-y-2 rounded-lg border p-4">
              <p className="text-sm font-medium">Select a global template</p>
              {sourceTemplates.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  disabled={cloning}
                  onClick={() => void handleClone(st.id, st.name)}
                  className="block w-full rounded-md border p-3 text-left text-sm hover:bg-accent/40 disabled:opacity-50"
                >
                  <p className="font-medium">{st.name}</p>
                  <p className="text-muted-foreground">
                    {st.totalPoints} pts · {st.sectionCount} sections ·{" "}
                    {st.methodology.replace(/_/g, " ")}
                  </p>
                </button>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowClonePicker(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowClonePicker(true)}
              disabled={cloning || sourceTemplates.length === 0}
            >
              {cloning ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Plus className="mr-2 size-4" />
              )}
              Start from Template
            </Button>
          )}
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {draft && editLockInfo ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Score Sheet Template</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreSheetTemplateEditor
              draft={draft}
              setDraft={setDraft}
              editLockInfo={editLockInfo}
              warnings={warnings}
              saving={saving}
              onSave={() => void handleSave()}
              showPreview={showPreview}
              onTogglePreview={() => setShowPreview((v) => !v)}
            />
          </CardContent>
        </Card>
      ) : null}

      <EventJudgingClassPanel
        eventId={eventId}
        templates={templates}
        vehicleClasses={vehicleClasses}
        classes={judgingClasses}
        onChanged={() => void loadLists()}
      />
    </div>
  );
}
