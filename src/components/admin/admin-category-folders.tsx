"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  FolderClosed,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CatItem = { id: string; name: string; sortOrder: number };
type GroupItem = { id: string; name: string; sortOrder: number; categories: CatItem[] };
type ApiResponse = { groups: GroupItem[]; ungrouped: CatItem[] };

export function AdminCategoryFolders() {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [ungrouped, setUngrouped] = useState<CatItem[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [newGroupName, setNewGroupName] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [addCatGroupId, setAddCatGroupId] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"group" | "category">("group");

  // Drag state for groups
  const groupDragRef = useRef<number | null>(null);
  const [groupDragIdx, setGroupDragIdx] = useState<number | null>(null);
  const [groupOverIdx, setGroupOverIdx] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/category-groups", { credentials: "same-origin" });
    if (res.ok) {
      const data = (await res.json()) as ApiResponse;
      setGroups(data.groups);
      setUngrouped(data.ungrouped);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // --- Group drag-and-drop ---
  function onGroupDragStart(idx: number) { groupDragRef.current = idx; setGroupDragIdx(idx); }
  function onGroupDragOver(e: React.DragEvent, idx: number) { e.preventDefault(); setGroupOverIdx(idx); }
  function onGroupDragEnd() { setGroupDragIdx(null); setGroupOverIdx(null); }
  function onGroupDrop(idx: number) {
    const from = groupDragRef.current;
    if (from === null || from === idx) { onGroupDragEnd(); return; }
    const copy = [...groups];
    const [moved] = copy.splice(from, 1);
    copy.splice(idx, 0, moved);
    setGroups(copy);
    onGroupDragEnd();
    void fetch("/api/admin/category-groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ orderedGroupIds: copy.map((g) => g.id) }),
    });
  }

  // --- Category reorder within a list ---
  async function reorderCategories(list: CatItem[], fromIdx: number, toIdx: number, groupId: string | null) {
    const copy = [...list];
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);

    if (groupId) {
      setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, categories: copy } : g));
    } else {
      setUngrouped(copy);
    }

    await fetch("/api/admin/category-groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ orderedCategoryIds: copy.map((c) => c.id) }),
    });
  }

  // --- CRUD ---
  async function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setBusy(true); setError("");
    const res = await fetch("/api/admin/category-groups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "same-origin", body: JSON.stringify({ name: newGroupName.trim() }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) setError(data.error ?? "Could not create group.");
    else { setNewGroupName(""); await load(); }
    setBusy(false);
  }

  async function handleAddCategory(e: React.FormEvent, groupId: string | null) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setBusy(true); setError("");
    const res = await fetch("/api/admin/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "same-origin", body: JSON.stringify({ name: newCatName.trim() }),
    });
    const data = (await res.json()) as { category?: { id: string }; error?: string };
    if (!res.ok) { setError(data.error ?? "Could not create."); setBusy(false); return; }
    if (groupId && data.category) {
      await fetch("/api/admin/category-groups", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ assignCategory: { categoryId: data.category.id, groupId } }),
      });
    }
    setNewCatName(""); setAddCatGroupId(null); await load(); setBusy(false);
  }

  async function handleDeleteGroup(id: string) {
    if (!confirm("Delete this group? Categories inside will become ungrouped.")) return;
    await fetch(`/api/admin/category-groups?id=${id}`, { method: "DELETE", credentials: "same-origin" });
    void load();
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm("Remove this category?")) return;
    await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE", credentials: "same-origin" });
    void load();
  }

  async function handleSaveEdit() {
    if (!editId || !editName.trim()) return;
    setBusy(true); setError("");
    const url = editType === "group" ? "/api/admin/category-groups" : "/api/admin/categories";
    const res = await fetch(url, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      credentials: "same-origin", body: JSON.stringify({ id: editId, name: editName.trim() }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) setError(data.error ?? "Could not rename.");
    else { setEditId(null); await load(); }
    setBusy(false);
  }

  async function handleMoveCategory(categoryId: string, toGroupId: string | null) {
    await fetch("/api/admin/category-groups", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ assignCategory: { categoryId, groupId: toGroupId } }),
    });
    void load();
  }

  function startEdit(id: string, name: string, type: "group" | "category") {
    setEditId(id); setEditName(name); setEditType(type);
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <form onSubmit={handleAddGroup} className="flex gap-2">
        <Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="New group name (e.g. By Vehicle Year)" className="max-w-sm text-sm" disabled={busy} />
        <Button type="submit" size="sm" disabled={busy || !newGroupName.trim()} className="gap-1.5">
          <Plus className="size-4" /> Add Group
        </Button>
      </form>

      <div className="space-y-1">
        {groups.map((g, gIdx) => {
          const isOpen = expanded.has(g.id);
          return (
            <div
              key={g.id}
              draggable
              onDragStart={() => onGroupDragStart(gIdx)}
              onDragOver={(e) => onGroupDragOver(e, gIdx)}
              onDrop={() => onGroupDrop(gIdx)}
              onDragEnd={onGroupDragEnd}
              className={`rounded-lg border bg-card shadow-sm transition-all ${
                groupDragIdx === gIdx ? "opacity-50" : ""
              } ${groupOverIdx === gIdx && groupDragIdx !== gIdx ? "ring-2 ring-primary/40" : ""}`}
            >
              <div className="flex items-center gap-2 px-3 py-2.5">
                <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
                <button type="button" className="flex items-center gap-2 flex-1 text-left text-sm font-semibold"
                  onClick={() => toggle(g.id)}>
                  {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  {isOpen ? <FolderOpen className="size-4 text-primary" /> : <FolderClosed className="size-4 text-muted-foreground" />}
                  {editId === g.id && editType === "group" ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="h-7 w-48 text-sm" autoFocus disabled={busy}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleSaveEdit(); } if (e.key === "Escape") setEditId(null); }} />
                      <Button size="icon" variant="ghost" className="size-7 text-emerald-600" disabled={busy}
                        onClick={(e) => { e.stopPropagation(); void handleSaveEdit(); }} aria-label="Save">
                        <Check className="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7"
                        onClick={(e) => { e.stopPropagation(); setEditId(null); }} aria-label="Cancel">
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <span>{g.name}</span>
                  )}
                  <span className="text-xs font-normal text-muted-foreground">({g.categories.length})</span>
                </button>
                {editId !== g.id && (
                  <div className="flex shrink-0 gap-0.5">
                    <Button type="button" variant="ghost" size="icon" className="size-7"
                      onClick={() => startEdit(g.id, g.name, "group")} aria-label={`Edit ${g.name}`}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="size-7 text-destructive hover:bg-destructive/10"
                      onClick={() => void handleDeleteGroup(g.id)} aria-label={`Delete ${g.name}`}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {isOpen && (
                <div className="border-t px-3 pb-3 pt-2">
                  <DraggableCategoryList
                    categories={g.categories}
                    groupId={g.id}
                    groups={groups}
                    editId={editId}
                    editName={editName}
                    busy={busy}
                    onReorder={(from, to) => void reorderCategories(g.categories, from, to, g.id)}
                    onStartEdit={(id, name) => startEdit(id, name, "category")}
                    onSetEditName={setEditName}
                    onSaveEdit={() => void handleSaveEdit()}
                    onCancelEdit={() => setEditId(null)}
                    onDelete={(id) => void handleDeleteCategory(id)}
                    onMove={(catId, toGroup) => void handleMoveCategory(catId, toGroup)}
                  />
                  {addCatGroupId === g.id ? (
                    <form onSubmit={(e) => void handleAddCategory(e, g.id)} className="mt-2 flex gap-2 pl-6">
                      <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="Category name" className="h-8 max-w-xs text-sm" autoFocus disabled={busy} />
                      <Button type="submit" size="sm" className="h-8" disabled={busy || !newCatName.trim()}>Add</Button>
                      <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => setAddCatGroupId(null)}>Cancel</Button>
                    </form>
                  ) : (
                    <Button type="button" variant="ghost" size="sm" className="mt-1 ml-6 gap-1 text-xs"
                      onClick={() => { setAddCatGroupId(g.id); setNewCatName(""); }}>
                      <Plus className="size-3" /> Add category to group
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {ungrouped.length > 0 && (
          <div className="rounded-lg border bg-card shadow-sm">
            <button type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-muted-foreground"
              onClick={() => toggle("__ungrouped")}>
              {expanded.has("__ungrouped") ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              <span>Ungrouped</span>
              <span className="text-xs font-normal">({ungrouped.length})</span>
            </button>
            {expanded.has("__ungrouped") && (
              <div className="border-t px-3 pb-3 pt-2">
                <DraggableCategoryList
                  categories={ungrouped}
                  groupId={null}
                  groups={groups}
                  editId={editId}
                  editName={editName}
                  busy={busy}
                  onReorder={(from, to) => void reorderCategories(ungrouped, from, to, null)}
                  onStartEdit={(id, name) => startEdit(id, name, "category")}
                  onSetEditName={setEditName}
                  onSaveEdit={() => void handleSaveEdit()}
                  onCancelEdit={() => setEditId(null)}
                  onDelete={(id) => void handleDeleteCategory(id)}
                  onMove={(catId, toGroup) => void handleMoveCategory(catId, toGroup)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {addCatGroupId === null && groups.length === 0 && (
        <form onSubmit={(e) => void handleAddCategory(e, null)} className="flex gap-2">
          <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New category name" className="max-w-sm text-sm" disabled={busy} />
          <Button type="submit" size="sm" disabled={busy || !newCatName.trim()} className="gap-1.5">
            <Plus className="size-4" /> Add Category
          </Button>
        </form>
      )}

      {groups.length > 1 && (
        <p className="text-xs text-muted-foreground">
          Drag group handles to reorder folders. Drag category handles to reorder within a group.
        </p>
      )}
    </div>
  );
}

/** Renders a list of categories with working drag-and-drop reordering. */
function DraggableCategoryList({
  categories,
  groupId,
  groups,
  editId,
  editName,
  busy,
  onReorder,
  onStartEdit,
  onSetEditName,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onMove,
}: {
  categories: CatItem[];
  groupId: string | null;
  groups: GroupItem[];
  editId: string | null;
  editName: string;
  busy: boolean;
  onReorder: (fromIdx: number, toIdx: number) => void;
  onStartEdit: (id: string, name: string) => void;
  onSetEditName: (n: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onMove: (catId: string, toGroupId: string | null) => void;
}) {
  const dragRef = useRef<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  function handleDragStart(e: React.DragEvent, idx: number) {
    e.stopPropagation();
    dragRef.current = idx;
    setDragIdx(idx);
  }
  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    e.stopPropagation();
    setOverIdx(idx);
  }
  function handleDrop(e: React.DragEvent, idx: number) {
    e.stopPropagation();
    const from = dragRef.current;
    if (from !== null && from !== idx) onReorder(from, idx);
    setDragIdx(null);
    setOverIdx(null);
  }
  function handleDragEnd() { setDragIdx(null); setOverIdx(null); }

  return (
    <div className="space-y-1 pl-6">
      {categories.map((c, idx) => {
        const isEditing = editId === c.id;
        return (
          <div
            key={c.id}
            draggable={!isEditing}
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-2 rounded border bg-background px-3 py-1.5 text-sm transition-all ${
              dragIdx === idx ? "opacity-50" : ""
            } ${overIdx === idx && dragIdx !== idx ? "ring-2 ring-primary/40" : ""}`}
          >
            <GripVertical className="size-3.5 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
            {isEditing ? (
              <div className="flex flex-1 items-center gap-1">
                <Input value={editName} onChange={(e) => onSetEditName(e.target.value)}
                  className="h-7 w-48 text-sm" autoFocus disabled={busy}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSaveEdit(); } if (e.key === "Escape") onCancelEdit(); }} />
                <Button size="icon" variant="ghost" className="size-6 text-emerald-600" disabled={busy}
                  onClick={onSaveEdit} aria-label="Save"><Check className="size-3" /></Button>
                <Button size="icon" variant="ghost" className="size-6"
                  onClick={onCancelEdit} aria-label="Cancel"><X className="size-3" /></Button>
              </div>
            ) : (
              <span className="flex-1">{c.name}</span>
            )}
            {!isEditing && (
              <div className="flex shrink-0 items-center gap-0.5">
                <select
                  className="h-6 rounded border bg-background px-1 text-xs text-muted-foreground"
                  value={groupId ?? ""}
                  onChange={(e) => onMove(c.id, e.target.value || null)}
                  title="Move to group"
                >
                  <option value="">Ungrouped</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <Button type="button" variant="ghost" size="icon" className="size-6"
                  onClick={() => onStartEdit(c.id, c.name)} aria-label={`Edit ${c.name}`}>
                  <Pencil className="size-3" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="size-6 text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(c.id)} aria-label={`Delete ${c.name}`}>
                  <Trash2 className="size-3" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
      {categories.length === 0 && (
        <p className="py-2 text-xs text-muted-foreground">No categories in this group yet.</p>
      )}
    </div>
  );
}
