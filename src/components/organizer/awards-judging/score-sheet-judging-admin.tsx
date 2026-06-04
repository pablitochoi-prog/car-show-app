"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ClipboardList, Loader2, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScoreSheetTemplateEditor } from "@/components/organizer/awards-judging/score-sheet-template-editor";
import { ScoreSheetTemplateList } from "@/components/organizer/awards-judging/score-sheet-template-list";
import { formatTemplateDraftValidationErrors } from "@/lib/judging/scorecard-template-mapper";
import { apiTemplateToDraft } from "@/lib/judging/scorecard-template-draft-mapper";
import {
  toStructurePayload,
  type EditLockInfo,
  type EventTemplateSummary,
  type SourceTemplate,
  type TemplateDraft,
  type ValidationWarning,
  type VehicleClassOption,
} from "@/components/organizer/awards-judging/score-sheet-types";

export function ScoreSheetJudgingAdmin({
  eventId,
  vehicleClasses,
}: {
  eventId: string;
  vehicleClasses: VehicleClassOption[];
}) {
  const [templates, setTemplates] = useState<EventTemplateSummary[]>([]);
  const [sourceTemplates, setSourceTemplates] = useState<SourceTemplate[]>([]);
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
  const [showArchived, setShowArchived] = useState(false);
  const [blockingErrors, setBlockingErrors] = useState<string[]>([]);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const draftRef = useRef<TemplateDraft | null>(null);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const loadLists = useCallback(async () => {
    const [tplRes, srcRes] = await Promise.all([
      fetch(`/api/events/${eventId}/judging-templates`),
      fetch(`/api/events/${eventId}/judging-templates/source`),
    ]);
    const tplData = await tplRes.json();
    const srcData = await srcRes.json();
    setTemplates(tplData.templates ?? []);
    setSourceTemplates(srcData.templates ?? []);
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
        setEditLockInfo({
          ...data.editLockInfo,
          scoreSheetCount: data.template._count?.scoreSheets ?? 0,
        });
        setWarnings(data.warnings ?? []);
        setBlockingErrors([]);
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
          name: sourceName,
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

  function applyLoadedTemplate(data: {
    template: Parameters<typeof apiTemplateToDraft>[0];
    editLockInfo: EditLockInfo;
    warnings?: ValidationWarning[];
    saveWarnings?: ValidationWarning[];
  }) {
    setDraft(apiTemplateToDraft(data.template));
    setEditLockInfo({
      ...data.editLockInfo,
      scoreSheetCount: data.template._count?.scoreSheets ?? 0,
    });
    setWarnings(data.warnings ?? data.saveWarnings ?? []);
    setBlockingErrors([]);
    setError(null);
  }

  async function handleSave() {
    const currentDraft = draftRef.current;
    if (!selectedTemplateId || !currentDraft || !editLockInfo) return;

    const clientErrors = formatTemplateDraftValidationErrors(currentDraft);
    if (editLockInfo.canEditStructure && clientErrors.length > 0) {
      setBlockingErrors(clientErrors);
      setError("Fix validation errors before saving.");
      return;
    }

    setSaving(true);
    setError(null);
    setSavedMessage(null);
    setBlockingErrors([]);
    try {
      const structurePayload = toStructurePayload(currentDraft);
      let structData: {
        template: Parameters<typeof apiTemplateToDraft>[0];
        editLockInfo: EditLockInfo;
        warnings?: ValidationWarning[];
        saveWarnings?: ValidationWarning[];
      } | null = null;

      if (editLockInfo.canEditStructure) {
        const structRes = await fetch(
          `/api/events/${eventId}/judging-templates/${selectedTemplateId}/structure`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(structurePayload),
          },
        );
        const structBody = await structRes.json();
        if (!structRes.ok) {
          throw new Error(
            (structBody as { error?: string }).error ?? "Structure save failed.",
          );
        }
        structData = structBody;
      } else if (editLockInfo.canEditGuidance) {
        const guidanceRes = await fetch(
          `/api/events/${eventId}/judging-templates/${selectedTemplateId}/guidance`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sections: currentDraft.sections.map((section) => ({
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
        const guidanceBody = await guidanceRes.json();
        if (!guidanceRes.ok) {
          throw new Error(
            (guidanceBody as { error?: string }).error ?? "Guidance save failed.",
          );
        }
        structData = guidanceBody;
      }

      const metaRes = await fetch(
        `/api/events/${eventId}/judging-templates/${selectedTemplateId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: currentDraft.name.trim(),
            description: currentDraft.description.trim() || null,
            ...(editLockInfo.canEditStructure
              ? {
                  totalPoints: currentDraft.totalPoints,
                  scoringGroup: structurePayload.scoringGroup,
                  vehicleType: structurePayload.vehicleType,
                  methodology: structurePayload.methodology,
                }
              : {}),
          }),
        },
      );
      const metaData = await metaRes.json();
      if (!metaRes.ok) throw new Error(metaData.error ?? "Metadata save failed.");

      const response = structData ?? metaData;
      applyLoadedTemplate(response);
      setSavedMessage("Template saved.");
      await loadLists();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && templates.length === 0 && !draft) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/organizer/events/${eventId}/awards-judging/score-sheets/assignments`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Assign judges
        </Link>
        <Link
          href={`/organizer/events/${eventId}/awards-judging/score-sheets/results`}
          className={cn(buttonVariants())}
        >
          View Results
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="size-5" />
            Score Sheet Templates
          </CardTitle>
          <CardDescription>
            Add templates for this event, drag to set display order, and choose which
            registration vehicle classes use each template. Select a row to edit
            categories and scoring rules. Changes here do not affect global templates
            or other events.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScoreSheetTemplateList
            eventId={eventId}
            templates={templates}
            vehicleClasses={vehicleClasses}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={(id) => void loadTemplateDetail(id)}
            onTemplatesChange={setTemplates}
            onVehicleClassError={setError}
            onTemplateDeleted={(templateId) => {
              if (selectedTemplateId === templateId) {
                setSelectedTemplateId(null);
                setDraft(null);
                setEditLockInfo(null);
                setWarnings([]);
              }
            }}
          />

          {showClonePicker ? (
            <div className="space-y-2 rounded-lg border p-4">
              <p className="text-sm font-medium">Add template from library</p>
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
                    {st.totalPoints} pts · {st.sectionCount} categories ·{" "}
                    {st.methodology.replace(/_/g, " ")}
                    {st.vehicleType ? ` · ${st.vehicleType}` : ""}
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
              Add template
            </Button>
          )}
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {savedMessage ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">{savedMessage}</p>
      ) : null}

      {loading && selectedTemplateId && !draft ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {draft && editLockInfo ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit score sheet template</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreSheetTemplateEditor
              draft={draft}
              setDraft={setDraft}
              editLockInfo={editLockInfo}
              warnings={warnings}
              blockingErrors={blockingErrors}
              saving={saving}
              onSave={() => void handleSave()}
              showPreview={showPreview}
              onTogglePreview={() => setShowPreview((v) => !v)}
              showArchived={showArchived}
              onShowArchivedChange={setShowArchived}
              excelExportHref={`/api/events/${eventId}/judging-templates/${selectedTemplateId}/export`}
              excelImportHref={`/api/events/${eventId}/judging-templates/${selectedTemplateId}/import`}
              onExcelImportSuccess={(data) => {
                applyLoadedTemplate(
                  data as Parameters<typeof applyLoadedTemplate>[0],
                );
                setSavedMessage("Template imported from Excel.");
                void loadLists();
              }}
              onExcelError={(message) => setError(message ?? null)}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
