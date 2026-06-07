"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { KnowledgeImportPreview } from "@/lib/help/knowledge-article-import";
import type { KnowledgeImportConflictResolution } from "@/lib/help/knowledge-article-import";

type Props = {
  disabled?: boolean;
  onImported: () => void;
};

export function AdminKnowledgeImportDialog({ disabled, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<KnowledgeImportPreview | null>(null);
  const [resolutions, setResolutions] = useState<
    Record<string, KnowledgeImportConflictResolution>
  >({});

  function reset() {
    setPreview(null);
    setResolutions({});
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function handleFileChange(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/knowledge-articles/import/preview", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as KnowledgeImportPreview & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not preview import.");
        return;
      }
      setPreview(data);
      const defaults: Record<string, KnowledgeImportConflictResolution> = {};
      for (const conflict of data.conflicts) {
        defaults[conflict.slug] = "keep_both";
      }
      setResolutions(defaults);
    } catch {
      setError("Could not preview import.");
    } finally {
      setBusy(false);
    }
  }

  async function runImport(confirmReplace: boolean) {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/knowledge-articles/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: preview.rows,
          resolutions,
          confirmReplace,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        result?: {
          created: number;
          replaced: number;
          keptBoth: number;
          skipped: number;
          errors: string[];
        };
      };
      if (!res.ok) {
        setError(data.error ?? "Import failed.");
        return;
      }
      const r = data.result;
      if (r?.errors?.length) {
        setError(r.errors.join(" "));
      }
      if (r && r.errors.length === 0) {
        onImported();
        close();
      } else if (r && (r.created > 0 || r.replaced > 0 || r.keptBoth > 0)) {
        onImported();
        close();
      }
    } catch {
      setError("Import failed.");
    } finally {
      setBusy(false);
    }
  }

  function handleImportClick() {
    if (!preview) return;
    const hasReplace = preview.conflicts.some(
      (c) => resolutions[c.slug] === "replace",
    );
    if (hasReplace) {
      const ok = window.confirm(
        "Replace will overwrite existing articles for the selected slugs. This cannot be undone. Continue?",
      );
      if (!ok) return;
      void runImport(true);
      return;
    }
    void runImport(false);
  }

  const replaceCount = preview
    ? preview.conflicts.filter((c) => resolutions[c.slug] === "replace").length
    : 0;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        Import Knowledge Articles
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="knowledge-import-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-background p-6 shadow-lg">
            <h2 id="knowledge-import-title" className="text-lg font-semibold">
              Import Knowledge Articles
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload an Excel (.xlsx) file exported from this repository. Edit article
              text directly in Excel cells (use Alt+Enter for line breaks). New slugs are
              created automatically. Existing slugs can be replaced or kept as duplicate
              copies with new IDs and slugs.
            </p>

            <div className="mt-4">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="block w-full text-sm"
                disabled={busy}
                onChange={(e) => void handleFileChange(e.target.files?.[0])}
              />
            </div>

            {preview ? (
              <div className="mt-4 space-y-3 text-sm">
                <p>
                  <strong>{preview.totalRows}</strong> row(s):{" "}
                  <strong>{preview.newCount}</strong> new,{" "}
                  <strong>{preview.conflictCount}</strong> slug conflict(s).
                </p>
                {preview.parseErrors.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-destructive">
                    {preview.parseErrors.map((msg) => (
                      <li key={msg}>{msg}</li>
                    ))}
                  </ul>
                ) : null}
                {preview.conflicts.length > 0 ? (
                  <div className="space-y-3 rounded-lg border p-3">
                    <p className="font-medium">Slug conflicts</p>
                    {preview.conflicts.map((conflict) => (
                      <div
                        key={conflict.slug}
                        className="rounded-md border bg-muted/20 p-3"
                      >
                        <p className="font-mono text-xs">{conflict.slug}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Existing: {conflict.existingDisplayId} —{" "}
                          {conflict.existingTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Import: {conflict.importTitle}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 text-xs">
                            <input
                              type="radio"
                              name={`resolution-${conflict.slug}`}
                              checked={resolutions[conflict.slug] === "replace"}
                              onChange={() =>
                                setResolutions((prev) => ({
                                  ...prev,
                                  [conflict.slug]: "replace",
                                }))
                              }
                            />
                            Replace existing
                          </label>
                          <label className="flex items-center gap-2 text-xs">
                            <input
                              type="radio"
                              name={`resolution-${conflict.slug}`}
                              checked={resolutions[conflict.slug] === "keep_both"}
                              onChange={() =>
                                setResolutions((prev) => ({
                                  ...prev,
                                  [conflict.slug]: "keep_both",
                                }))
                              }
                            />
                            Keep both copies (new ID + slug)
                          </label>
                        </div>
                      </div>
                    ))}
                    {replaceCount > 0 ? (
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        {replaceCount} article(s) set to Replace — you will be
                        asked to confirm before import runs.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {error ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={close}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={busy || !preview || preview.parseErrors.length > 0 || preview.rows.length === 0}
                onClick={handleImportClick}
              >
                {busy ? "Importing…" : "Import"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
