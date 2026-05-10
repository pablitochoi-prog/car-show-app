"use client";

import { useState, useEffect, useCallback } from "react";
import { DraggableCardList, type CardItem } from "./draggable-card-list";

type RoleRow = { slug: string; name: string; sortOrder: number };

export function AdminStaffRolesSection() {
  const [items, setItems] = useState<CardItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/staff-roles", { credentials: "same-origin" });
    if (res.ok) {
      const data = (await res.json()) as { roles: RoleRow[] };
      setItems(data.roles.map((r) => ({ id: r.slug, name: r.name })));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleReorder(orderedIds: string[]) {
    const reordered = orderedIds.map((id) => items.find((i) => i.id === id)!).filter(Boolean);
    setItems(reordered);
    const res = await fetch("/api/admin/staff-roles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ reorder: orderedIds }),
    });
    if (res.ok) {
      const data = (await res.json()) as { roles: RoleRow[] };
      setItems(data.roles.map((r) => ({ id: r.slug, name: r.name })));
    }
  }

  async function handleRename(slug: string, newName: string) {
    setError("");
    const res = await fetch("/api/admin/staff-roles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ slug, name: newName }),
    });
    const data = (await res.json()) as { roles?: RoleRow[]; error?: string };
    if (!res.ok) { setError(data.error ?? "Could not rename."); return; }
    if (data.roles) setItems(data.roles.map((r) => ({ id: r.slug, name: r.name })));
  }

  async function handleAdd(name: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/staff-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as { roles?: RoleRow[]; error?: string };
      if (!res.ok) { setError(data.error ?? "Could not add."); return; }
      if (data.roles) setItems(data.roles.map((r) => ({ id: r.slug, name: r.name })));
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(slug: string) {
    if (!confirm("Remove this default staff role?")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/staff-roles?slug=${slug}`, { method: "DELETE", credentials: "same-origin" });
    if (res.ok) {
      const data = (await res.json()) as { roles: RoleRow[] };
      setItems(data.roles.map((r) => ({ id: r.slug, name: r.name })));
    }
    setBusy(false);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Default roles seeded into every new event. Drag to reorder. Changes only affect future events.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DraggableCardList
        items={items}
        onReorder={handleReorder}
        onAdd={handleAdd}
        onRename={handleRename}
        onRemove={handleRemove}
        addPlaceholder="New role name"
        emptyMessage="No default roles configured."
        busy={busy}
      />
    </div>
  );
}
