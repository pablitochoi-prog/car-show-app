"use client";

import { useState } from "react";
import { DraggableCardList, type CardItem } from "./draggable-card-list";

type CategoryRow = { id: string; name: string; isSystem: boolean };

export function AdminCategoryList({
  initialCategories,
}: {
  initialCategories: CategoryRow[];
}) {
  const [items, setItems] = useState<CardItem[]>(
    initialCategories.map((c) => ({ id: c.id, name: c.name })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleReorder(orderedIds: string[]) {
    const reordered = orderedIds.map((id) => items.find((i) => i.id === id)!).filter(Boolean);
    setItems(reordered);
    const res = await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ orderedIds }),
    });
    if (res.ok) {
      const data = (await res.json()) as { categories: { id: string; name: string }[] };
      setItems(data.categories.map((c) => ({ id: c.id, name: c.name })));
    }
  }

  async function handleRename(id: string, newName: string) {
    setError("");
    const res = await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id, name: newName }),
    });
    const data = (await res.json()) as { categories?: { id: string; name: string }[]; error?: string };
    if (!res.ok) { setError(data.error ?? "Could not rename."); return; }
    if (data.categories) setItems(data.categories.map((c) => ({ id: c.id, name: c.name })));
  }

  async function handleAdd(name: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as { category?: { id: string; name: string }; error?: string };
      if (!res.ok) { setError(data.error ?? "Could not create."); return; }
      if (data.category) setItems((prev) => [...prev, { id: data.category!.id, name: data.category!.name }]);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this category?")) return;
    setBusy(true);
    await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE", credentials: "same-origin" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    setBusy(false);
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DraggableCardList
        items={items}
        onReorder={handleReorder}
        onAdd={handleAdd}
        onRename={handleRename}
        onRemove={handleRemove}
        addPlaceholder="New category name"
        emptyMessage="No categories yet."
        busy={busy}
      />
    </div>
  );
}
