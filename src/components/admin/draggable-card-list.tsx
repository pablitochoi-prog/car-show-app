"use client";

import { useState, useRef } from "react";
import { GripVertical, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type CardItem = { id: string; name: string };

export function DraggableCardList({
  items,
  onReorder,
  onAdd,
  onRename,
  onRemove,
  addPlaceholder = "New item name",
  emptyMessage = "No items yet.",
  busy = false,
}: {
  items: CardItem[];
  onReorder: (orderedIds: string[]) => Promise<void>;
  onAdd: (name: string) => Promise<void>;
  onRename?: (id: string, newName: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  addPlaceholder?: string;
  emptyMessage?: string;
  busy?: boolean;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const dragRef = useRef<number | null>(null);

  function handleDragStart(idx: number) {
    dragRef.current = idx;
    setDragIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setOverIdx(idx);
  }

  function handleDrop(idx: number) {
    const from = dragRef.current;
    if (from === null || from === idx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const copy = [...items];
    const [moved] = copy.splice(from, 1);
    copy.splice(idx, 0, moved);
    setDragIdx(null);
    setOverIdx(null);
    void onReorder(copy.map((i) => i.id));
  }

  async function handleSubmitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await onAdd(newName.trim());
    setNewName("");
  }

  async function handleSaveRename() {
    if (!editId || !editName.trim() || !onRename) return;
    const original = items.find((i) => i.id === editId);
    if (original && original.name === editName.trim()) {
      setEditId(null);
      return;
    }
    setSaving(true);
    await onRename(editId, editName.trim());
    setSaving(false);
    setEditId(null);
  }

  return (
    <div className="space-y-3">
      <form onSubmit={(e) => void handleSubmitAdd(e)} className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={addPlaceholder}
          className="max-w-sm text-sm"
          disabled={busy}
        />
        <Button type="submit" size="sm" disabled={busy || !newName.trim()} className="gap-1.5">
          Add
        </Button>
      </form>

      <div className="space-y-1">
        {items.map((item, idx) => (
          <div
            key={item.id}
            draggable={editId !== item.id}
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={() => handleDrop(idx)}
            onDragEnd={() => {
              setDragIdx(null);
              setOverIdx(null);
            }}
            className={`flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm shadow-sm transition-all ${
              dragIdx === idx ? "opacity-50" : ""
            } ${overIdx === idx && dragIdx !== idx ? "ring-2 ring-primary/40" : ""}`}
          >
            <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />

            {editId === item.id ? (
              <div className="flex flex-1 items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-7 max-w-[220px] text-sm"
                  autoFocus
                  disabled={saving}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); void handleSaveRename(); }
                    if (e.key === "Escape") setEditId(null);
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-emerald-600 hover:bg-emerald-500/10"
                  disabled={saving || !editName.trim()}
                  onClick={() => void handleSaveRename()}
                  aria-label="Save"
                >
                  <Check className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  disabled={saving}
                  onClick={() => setEditId(null)}
                  aria-label="Cancel"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              <span className="flex-1 font-medium">{item.name}</span>
            )}

            {editId !== item.id && (
              <div className="flex shrink-0 gap-0.5">
                {onRename && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={busy}
                    onClick={() => {
                      setEditId(item.id);
                      setEditName(item.name);
                    }}
                    aria-label={`Edit ${item.name}`}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:bg-destructive/10"
                  disabled={busy}
                  onClick={() => void onRemove(item.id)}
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        )}
      </div>

      {items.length > 1 && (
        <p className="text-xs text-muted-foreground">
          Drag cards to reorder. The order here controls how they appear in event dropdowns.
        </p>
      )}
    </div>
  );
}
