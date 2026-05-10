"use client";

import { useState, useEffect, useCallback } from "react";
import { DraggableCardList, type CardItem } from "./draggable-card-list";

type TplRow = { slug: string; name: string; sortOrder: number };

export function AdminTierTemplatesSection() {
  const [items, setItems] = useState<CardItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/tier-templates", { credentials: "same-origin" });
    if (res.ok) {
      const data = (await res.json()) as { templates: TplRow[] };
      setItems(data.templates.map((t) => ({ id: t.slug, name: t.name })));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleReorder(orderedIds: string[]) {
    const reordered = orderedIds.map((id) => items.find((i) => i.id === id)!).filter(Boolean);
    setItems(reordered);
    const res = await fetch("/api/admin/tier-templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ reorder: orderedIds }),
    });
    if (res.ok) {
      const data = (await res.json()) as { templates: TplRow[] };
      setItems(data.templates.map((t) => ({ id: t.slug, name: t.name })));
    }
  }

  async function handleRename(slug: string, newName: string) {
    setError("");
    const res = await fetch("/api/admin/tier-templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ slug, name: newName }),
    });
    const data = (await res.json()) as { templates?: TplRow[]; error?: string };
    if (!res.ok) { setError(data.error ?? "Could not rename."); return; }
    if (data.templates) setItems(data.templates.map((t) => ({ id: t.slug, name: t.name })));
  }

  async function handleAdd(name: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/tier-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as { templates?: TplRow[]; error?: string };
      if (!res.ok) { setError(data.error ?? "Could not add."); return; }
      if (data.templates) setItems(data.templates.map((t) => ({ id: t.slug, name: t.name })));
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(slug: string) {
    if (!confirm("Remove this tier template?")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/tier-templates?slug=${slug}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (res.ok) {
      const data = (await res.json()) as { templates: TplRow[] };
      setItems(data.templates.map((t) => ({ id: t.slug, name: t.name })));
    }
    setBusy(false);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Template names available when organizers create registration tiers. Drag to reorder.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DraggableCardList
        items={items}
        onReorder={handleReorder}
        onAdd={handleAdd}
        onRename={handleRename}
        onRemove={handleRemove}
        addPlaceholder="New tier name"
        emptyMessage="No tier templates configured."
        busy={busy}
      />
    </div>
  );
}
