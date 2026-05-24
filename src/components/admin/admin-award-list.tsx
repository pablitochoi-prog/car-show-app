"use client";

import { useRef, useState } from "react";
import { Check, GripVertical, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  isLockedPublicVoteAward,
  publicVoteAwardLabel,
} from "@/lib/sms/public-vote-awards";

type AwardRow = {
  id: string;
  name: string;
  isSystem: boolean;
  smsVotingEligible: boolean;
};

export function AdminAwardList({
  initialAwards,
}: {
  initialAwards: AwardRow[];
}) {
  const [items, setItems] = useState(initialAwards);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const dragRef = useRef<number | null>(null);

  function mapAwards(data: {
    id: string;
    name: string;
    isSystem?: boolean;
    smsVotingEligible?: boolean;
  }[]): AwardRow[] {
    return data.map((a) => ({
      id: a.id,
      name: a.name,
      isSystem: a.isSystem ?? true,
      smsVotingEligible: a.smsVotingEligible ?? false,
    }));
  }

  function handleDragStart(idx: number) {
    dragRef.current = idx;
    setDragIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setOverIdx(idx);
  }

  async function handleDrop(idx: number) {
    const from = dragRef.current;
    if (from === null || from === idx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const copy = [...items];
    const [moved] = copy.splice(from, 1);
    copy.splice(idx, 0, moved!);
    setItems(copy);
    setDragIdx(null);
    setOverIdx(null);
    const res = await fetch("/api/admin/awards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ orderedIds: copy.map((i) => i.id) }),
    });
    if (res.ok) {
      const data = (await res.json()) as { awards: AwardRow[] };
      setItems(mapAwards(data.awards));
    }
  }

  async function handleRename(id: string, name: string) {
    setError("");
    const res = await fetch("/api/admin/awards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id, name }),
    });
    const data = (await res.json()) as {
      awards?: AwardRow[];
      error?: string;
    };
    if (!res.ok) {
      setError(data.error ?? "Could not rename.");
      return;
    }
    if (data.awards) setItems(mapAwards(data.awards));
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
      const data = (await res.json()) as {
        award?: AwardRow;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not create.");
        return;
      }
      if (data.award) {
        setItems((prev) => [...prev, mapAwards([data.award!])[0]!]);
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this award category?")) return;
    setBusy(true);
    await fetch(`/api/admin/awards?id=${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    setItems((prev) => prev.filter((i) => i.id !== id));
    setBusy(false);
  }

  async function toggleSmsEligible(id: string, smsVotingEligible: boolean) {
    const award = items.find((i) => i.id === id);
    if (award && isLockedPublicVoteAward(award.name)) {
      return;
    }

    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/awards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id, smsVotingEligible }),
      });
      const data = (await res.json()) as {
        awards?: AwardRow[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not update SMS voting eligibility.");
        return;
      }
      if (data.awards) setItems(mapAwards(data.awards));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await handleAdd(newName.trim());
    setNewName("");
  }

  async function handleSaveRename() {
    if (!editId || !editName.trim()) return;
    const original = items.find((i) => i.id === editId);
    if (original && original.name === editName.trim()) {
      setEditId(null);
      return;
    }
    setSaving(true);
    await handleRename(editId, editName.trim());
    setSaving(false);
    setEditId(null);
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <form onSubmit={(e) => void handleSubmitAdd(e)} className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New award category name"
          className="max-w-sm text-sm"
          disabled={busy}
        />
        <Button type="submit" size="sm" disabled={busy || !newName.trim()}>
          Add
        </Button>
      </form>

      <div className="space-y-1">
        {items.map((item, idx) => {
          const lockedPublicVote = isLockedPublicVoteAward(item.name);
          const voteLabel = publicVoteAwardLabel(
            item.name,
            item.smsVotingEligible,
          );
          const isPublicVote = voteLabel === "Public vote";

          return (
          <div
            key={item.id}
            draggable={editId !== item.id}
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={() => void handleDrop(idx)}
            onDragEnd={() => {
              setDragIdx(null);
              setOverIdx(null);
            }}
            className={cn(
              "flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm shadow-sm transition-all sm:flex-nowrap",
              dragIdx === idx && "opacity-50",
              overIdx === idx && dragIdx !== idx && "ring-2 ring-primary/40",
            )}
          >
            <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />

            {editId === item.id ? (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-7 max-w-[220px] text-sm"
                  autoFocus
                  disabled={saving}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleSaveRename();
                    }
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
              <>
                <span className="min-w-0 flex-1 font-medium">{item.name}</span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
                    isPublicVote
                      ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {voteLabel}
                </span>
                {lockedPublicVote ? (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Always public vote
                  </span>
                ) : (
                  <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={item.smsVotingEligible}
                      disabled={busy || editId === item.id}
                      onChange={(e) =>
                        void toggleSmsEligible(item.id, e.target.checked)
                      }
                      className="size-3.5 rounded border-gray-300"
                    />
                    Public vote
                  </label>
                )}
              </>
            )}

            {editId !== item.id ? (
              <div className="flex shrink-0 gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={busy || lockedPublicVote}
                  onClick={() => {
                    setEditId(item.id);
                    setEditName(item.name);
                  }}
                  aria-label={`Edit ${item.name}`}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:bg-destructive/10"
                  disabled={busy || lockedPublicVote}
                  onClick={() => void handleRemove(item.id)}
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ) : null}
          </div>
          );
        })}
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No award categories yet.
          </p>
        ) : null}
      </div>

      {items.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Drag to reorder. <strong>People&apos;s Choice</strong> and{" "}
          <strong>Kid&apos;s Choice</strong> are always public vote categories
          (SMS or QR) when used at an event. Other awards are judge graded unless
          you mark them as public vote.
        </p>
      ) : null}
    </div>
  );
}
