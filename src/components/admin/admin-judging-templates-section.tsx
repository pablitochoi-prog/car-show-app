"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Archive, ArchiveRestore, Loader2, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminDeleteJudgingTemplateDialog } from "@/components/admin/admin-delete-judging-template-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScoreSheetTemplateEditor } from "@/components/organizer/awards-judging/score-sheet-template-editor";
import { formatTemplateDraftValidationErrors } from "@/lib/judging/scorecard-template-mapper";
import { apiTemplateToDraft } from "@/lib/judging/scorecard-template-draft-mapper";
import {
  toStructurePayload,
  type EditLockInfo,
  type TemplateDraft,
  type ValidationWarning,
} from "@/components/organizer/awards-judging/score-sheet-types";

type TemplateListRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  methodology: string;
  totalPoints: number;
  scoringGroup?: string | null;
  vehicleType?: string | null;
  sortOrder: number;
  sectionCount: number;
  eventCopyCount?: number;
  isActive: boolean;
};

export function AdminJudgingTemplatesSection() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [templates, setTemplates] = useState<TemplateListRow[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TemplateDraft | null>(null);
  const [editLockInfo, setEditLockInfo] = useState<EditLockInfo | null>(null);
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [blockingErrors, setBlockingErrors] = useState<string[]>([]);
  const [actionTemplateId, setActionTemplateId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TemplateListRow | null>(null);

  const loadList = useCallback(async () => {
    const res = await fetch("/api/admin/judging-templates", {
      credentials: "same-origin",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { templates: TemplateListRow[] };
    setTemplates(data.templates ?? []);
  }, []);

  const loadTemplateDetail = useCallback(async (templateId: string) => {
    setDetailLoadingId(templateId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/judging-templates/${templateId}`, {
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load template.");
      applyLoadedTemplate(data);
      setSelectedTemplateId(templateId);
      requestAnimationFrame(() => {
        editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setDetailLoadingId(null);
    }
  }, []);

  function closeEditor() {
    setSelectedTemplateId(null);
    setDraft(null);
    setEditLockInfo(null);
    setWarnings([]);
    setBlockingErrors([]);
    setShowPreview(false);
    setShowArchived(false);
    setError(null);
  }

  useEffect(() => {
    void (async () => {
      setListLoading(true);
      await loadList();
      setListLoading(false);
    })();
  }, [loadList]);

  function applyLoadedTemplate(data: {
    template: Parameters<typeof apiTemplateToDraft>[0];
    editLockInfo: EditLockInfo;
    warnings?: ValidationWarning[];
    saveWarnings?: ValidationWarning[];
  }) {
    setDraft(apiTemplateToDraft(data.template));
    setEditLockInfo({
      ...data.editLockInfo,
      scoreSheetCount: data.template._count?.eventCopies ?? 0,
    });
    setWarnings(data.warnings ?? data.saveWarnings ?? []);
    setBlockingErrors([]);
    setError(null);
  }

  async function handleArchiveToggle(template: TemplateListRow) {
    setActionTemplateId(template.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/judging-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ isActive: !template.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Archive update failed.");
      if (selectedTemplateId === template.id && template.isActive) {
        closeEditor();
      }
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Archive update failed.");
    } finally {
      setActionTemplateId(null);
    }
  }

  async function handleSave() {
    if (!selectedTemplateId || !draft || !editLockInfo) return;

    const clientErrors = formatTemplateDraftValidationErrors(draft);
    if (clientErrors.length > 0) {
      setBlockingErrors(clientErrors);
      setError("Fix validation errors before saving.");
      return;
    }

    setSaving(true);
    setError(null);
    setBlockingErrors([]);
    try {
      const structurePayload = toStructurePayload(draft);
      const metaRes = await fetch(
        `/api/admin/judging-templates/${selectedTemplateId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            name: draft.name.trim(),
            description: draft.description.trim() || null,
            totalPoints: draft.totalPoints,
            scoringGroup: structurePayload.scoringGroup,
            vehicleType: structurePayload.vehicleType,
            methodology: structurePayload.methodology,
          }),
        },
      );
      const metaData = await metaRes.json();
      if (!metaRes.ok) throw new Error(metaData.error ?? "Metadata save failed.");

      const structRes = await fetch(
        `/api/admin/judging-templates/${selectedTemplateId}/structure`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(structurePayload),
        },
      );
      const structData = await structRes.json();
      if (!structRes.ok) {
        throw new Error(structData.error ?? "Structure save failed.");
      }

      applyLoadedTemplate(structData);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (listLoading && templates.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Click <span className="font-medium text-foreground">Edit</span> on a scoring
        template to change organization, vehicle type, scoring method, categories, and
        subcategories. Use{" "}
        <span className="font-medium text-foreground">Notes required for deduction</span>{" "}
        on each subcategory to control whether judges must enter a note before submit.
      </p>

      {templates.length > 0 ? (
        <div className="space-y-2">
          {templates.map((t) => {
            const editing = selectedTemplateId === t.id;
            const loadingDetail = detailLoadingId === t.id;
            const rowBusy = actionTemplateId === t.id;
            return (
              <div
                key={t.id}
                className={`flex flex-wrap items-start justify-between gap-3 rounded-md border p-3 text-sm ${
                  editing ? "border-primary bg-accent/30" : ""
                } ${!t.isActive ? "opacity-80" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{t.name}</p>
                    {!t.isActive ? (
                      <Badge variant="secondary" className="text-xs">
                        Archived
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground">
                    {t.totalPoints} pts · {t.sectionCount} categories
                    {t.scoringGroup ? ` · ${t.scoringGroup}` : ""}
                    {t.vehicleType ? ` · ${t.vehicleType}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t.methodology.replace(/_/g, " ")}
                    {typeof t.eventCopyCount === "number" && t.eventCopyCount > 0
                      ? ` · ${t.eventCopyCount} event cop${t.eventCopyCount === 1 ? "y" : "ies"}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant={editing ? "default" : "outline"}
                    size="sm"
                    disabled={
                      rowBusy ||
                      loadingDetail ||
                      (detailLoadingId !== null && !loadingDetail)
                    }
                    onClick={() => void loadTemplateDetail(t.id)}
                  >
                    {loadingDetail ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Pencil className="mr-2 size-4" />
                    )}
                    Edit
                  </Button>
                  {t.isActive ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={rowBusy}
                      onClick={() => void handleArchiveToggle(t)}
                    >
                      {rowBusy ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Archive className="mr-2 size-4" />
                      )}
                      Archive
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={rowBusy}
                      onClick={() => void handleArchiveToggle(t)}
                    >
                      {rowBusy ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <ArchiveRestore className="mr-2 size-4" />
                      )}
                      Restore
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={rowBusy}
                    onClick={() => setDeleteTarget(t)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No scoring templates found.</p>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {detailLoadingId && !draft ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {draft && editLockInfo ? (
        <Card ref={editorRef}>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Edit master template</CardTitle>
              <CardDescription>
                {editLockInfo.scoreSheetCount > 0
                  ? `${editLockInfo.scoreSheetCount} event(s) have copies cloned from this template.`
                  : "No event copies yet."}
              </CardDescription>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={closeEditor}>
              <X className="mr-2 size-4" />
              Close
            </Button>
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
              templateNameLabel="Master template name"
              excelExportHref={`/api/admin/judging-templates/${selectedTemplateId}/export`}
              excelImportHref={`/api/admin/judging-templates/${selectedTemplateId}/import`}
              onExcelImportSuccess={(data) => {
                applyLoadedTemplate(
                  data as Parameters<typeof applyLoadedTemplate>[0],
                );
                void loadList();
              }}
              onExcelError={(message) => setError(message ?? null)}
            />
          </CardContent>
        </Card>
      ) : !detailLoadingId ? (
        <p className="text-sm text-muted-foreground">
          Click Edit on a template to open the scoring settings editor.
        </p>
      ) : null}

      <AdminDeleteJudgingTemplateDialog
        open={deleteTarget !== null}
        templateId={deleteTarget?.id ?? ""}
        templateName={deleteTarget?.name ?? ""}
        eventCopyCount={deleteTarget?.eventCopyCount ?? 0}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => {
          if (deleteTarget && selectedTemplateId === deleteTarget.id) {
            closeEditor();
          }
          void loadList();
        }}
      />
    </div>
  );
}
