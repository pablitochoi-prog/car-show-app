"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  EventTemplateSummary,
  JudgingClassRow,
  VehicleClassOption,
} from "@/components/organizer/awards-judging/score-sheet-types";

type ClassForm = {
  name: string;
  description: string;
  eventJudgingTemplateId: string;
  eligibleEventCategoryIds: string[];
  isActive: boolean;
  sortOrder: number;
};

function emptyForm(templateId = ""): ClassForm {
  return {
    name: "",
    description: "",
    eventJudgingTemplateId: templateId,
    eligibleEventCategoryIds: [],
    isActive: true,
    sortOrder: 0,
  };
}

function MultiCheckboxList({
  options,
  selected,
  onChange,
}: {
  options: VehicleClassOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No vehicle classes configured for this event yet.
      </p>
    );
  }

  return (
    <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border p-3">
      {options.map((opt) => {
        const checked = selected.includes(opt.id);
        return (
          <label key={opt.id} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={checked}
              onChange={() =>
                onChange(
                  checked
                    ? selected.filter((id) => id !== opt.id)
                    : [...selected, opt.id],
                )
              }
              className="size-4 rounded border"
            />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}

export function EventJudgingClassPanel({
  eventId,
  templates,
  vehicleClasses,
  classes,
  onChanged,
}: {
  eventId: string;
  templates: EventTemplateSummary[];
  vehicleClasses: VehicleClassOption[];
  classes: JudgingClassRow[];
  onChanged: () => void;
}) {
  const [form, setForm] = useState<ClassForm>(() =>
    emptyForm(templates[0]?.id ?? ""),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(row: JudgingClassRow) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      description: row.description ?? "",
      eventJudgingTemplateId: row.eventJudgingTemplateId,
      eligibleEventCategoryIds: row.eligibleEventCategoryIds,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
    });
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm(templates[0]?.id ?? ""));
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const url = editingId
        ? `/api/events/${eventId}/judging-classes/${editingId}`
        : `/api/events/${eventId}/judging-classes`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed.");
      resetForm();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this judging class?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/judging-classes/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed.");
      if (editingId === id) resetForm();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Judging Classes</CardTitle>
        <CardDescription>
          Map vehicle classes to score sheet templates. Vehicle Class = registration
          class; Judging Class = which score sheet rules apply.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {classes.length > 0 ? (
          <div className="space-y-2">
            {classes.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-md border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {row.name}{" "}
                    {!row.isActive ? (
                      <Badge variant="outline">Inactive</Badge>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground">
                    Score Sheet Template: {row.templateName}
                  </p>
                  <p className="text-muted-foreground">
                    Vehicle Classes:{" "}
                    {row.eligibleVehicleClasses.length > 0
                      ? row.eligibleVehicleClasses.map((c) => c.label).join(", ")
                      : "None assigned"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Judge assignment — coming in Phase 2E
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(row)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDelete(row.id)}
                    disabled={saving}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No judging classes yet. Create one below after cloning a score sheet template.
          </p>
        )}

        <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
          <p className="font-medium">
            {editingId ? "Edit Judging Class" : "New Judging Class"}
          </p>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. AACA-Style Classic Restoration"
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={form.description}
              rows={2}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Score Sheet Template</Label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.eventJudgingTemplateId}
              onChange={(e) =>
                setForm({ ...form, eventJudgingTemplateId: e.target.value })
              }
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Eligible Vehicle Classes</Label>
            <MultiCheckboxList
              options={vehicleClasses}
              selected={form.eligibleEventCategoryIds}
              onChange={(ids) =>
                setForm({ ...form, eligibleEventCategoryIds: ids })
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sortOrder: parseInt(e.target.value, 10) || 0,
                  })
                }
              />
            </div>
            <label className="flex items-center gap-2 pt-8 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="size-4 rounded border"
              />
              Active
            </label>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {editingId ? "Update" : "Create"}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
