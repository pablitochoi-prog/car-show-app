"use client";

import { useState } from "react";
import { DraggableCardList, type CardItem } from "./draggable-card-list";

type AwardRow = { id: string; name: string; isSystem: boolean };

export function AdminAwardList({
  initialAwards,
}: {
  initialAwards: AwardRow[];
}) {
  const [items, setItems] = useState<CardItem[]>(
    initialAwards.map((a) => ({ id: a.id, name: a.name })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleReorder(orderedIds: string[]) {
    const reordered = orderedIds.map((id) => items.find((i) => i.id === id)!).filter(Boolean);
    setItems(reordered);
    const res = await fetch("/api/admin/awards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ orderedIds }),
    });
    if (res.ok) {
      const data = (await res.json()) as { awards: { id: string; name: string }[] };
      setItems(data.awards.map((a) => ({ id: a.id, name: a.name })));
    }
  }

  async function handleRename(id: string, newName: string) {
    setError("");
    const res = await fetch("/api/admin/awards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id, name: newName }),
    });
    const data = (await res.json()) as { awards?: { id: string; name: string }[]; error?: string };
    if (!res.ok) { setError(data.error ?? "Could not rename."); return; }
    if (data.awards) setItems(data.awards.map((a) => ({ id: a.id, name: a.name })));
  }

  async function handleAdd(name: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/awards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as { award?: { id: string; name: string }; error?: string };
      if (!res.ok) { setError(data.error ?? "Could not create."); return; }
      if (data.award) setItems((prev) => [...prev, { id: data.award!.id, name: data.award!.name }]);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this award category?")) return;
    setBusy(true);
    await fetch(`/api/admin/awards?id=${id}`, { method: "DELETE", credentials: "same-origin" });
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
        addPlaceholder="New award category name"
        emptyMessage="No award categories yet."
        busy={busy}
      />
    </div>
  );
}
