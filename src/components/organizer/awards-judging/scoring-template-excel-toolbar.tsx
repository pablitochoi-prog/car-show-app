"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ScoringTemplateExcelToolbar({
  exportHref,
  importHref,
  structureLocked,
  onImportSuccess,
  onError,
}: {
  exportHref: string;
  importHref: string;
  structureLocked: boolean;
  onImportSuccess: (data: unknown) => void;
  onError: (message: string | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  async function handleExport() {
    setExporting(true);
    setImportErrors([]);
    try {
      const res = await fetch(exportHref, { credentials: "same-origin" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Export failed.");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "scoring-template.xlsx";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(file: File) {
    setImporting(true);
    setImportErrors([]);
    onError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(importHref, {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        const errors = Array.isArray(data.errors) ? (data.errors as string[]) : [];
        if (errors.length > 0) setImportErrors(errors);
        throw new Error(data.error ?? "Import failed.");
      }
      onImportSuccess(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Import failed.";
      onError(msg);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <p className="text-xs text-muted-foreground">
        Export this template to Excel to edit categories and scoring rules in a
        spreadsheet, then import the updated file. Import replaces the full template
        structure.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={exporting}
          onClick={() => void handleExport()}
        >
          {exporting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="mr-2 size-4" />
          )}
          Export to Excel
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={importing || structureLocked}
          title={
            structureLocked
              ? "Structural edits are locked for this template."
              : undefined
          }
          onClick={() => fileInputRef.current?.click()}
        >
          {importing ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Upload className="mr-2 size-4" />
          )}
          Import from Excel
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImport(file);
          }}
        />
      </div>
      {structureLocked ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Import is disabled while structural edits are locked (submitted or finalized
          score sheets exist).
        </p>
      ) : null}
      {importErrors.length > 0 ? (
        <div
          className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs"
          role="alert"
        >
          <p className="font-medium">Spreadsheet errors:</p>
          <ul className="mt-1 list-disc pl-4">
            {importErrors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
