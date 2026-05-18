"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PickListOption = {
  id: string;
  label: string;
  group?: string | null;
};

export type PickListRow = {
  id: string;
  label: ReactNode;
  isCustom?: boolean;
};

type EventMultiPickListProps = {
  availableLabel: string;
  addPanelTitle: string;
  emptyListMessage?: string;
  options: PickListOption[];
  rows: PickListRow[];
  busy?: boolean;
  readOnly?: boolean;
  /** When options is empty (e.g. none left to add vs master library empty). */
  emptyOptionsMessage?: string;
  addExtras?: ReactNode;
  onAddSelected: (optionIds: string[]) => Promise<void>;
  onRemoveSelected: (rowIds: string[]) => Promise<void>;
};

function groupOptions(options: PickListOption[]) {
  const grouped = new Map<string, PickListOption[]>();
  const ungrouped: PickListOption[] = [];
  for (const option of options) {
    if (option.group) {
      const list = grouped.get(option.group) ?? [];
      list.push(option);
      grouped.set(option.group, list);
    } else {
      ungrouped.push(option);
    }
  }
  return { grouped, ungrouped };
}

export function EventMultiPickList({
  availableLabel,
  addPanelTitle,
  emptyListMessage = "Nothing added yet.",
  options,
  rows,
  busy = false,
  readOnly = false,
  emptyOptionsMessage,
  addExtras,
  onAddSelected,
  onRemoveSelected,
}: EventMultiPickListProps) {
  const [pickSelected, setPickSelected] = useState<Set<string>>(new Set());
  const [listSelected, setListSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  const { grouped, ungrouped } = useMemo(() => groupOptions(options), [options]);

  const allListSelected =
    rows.length > 0 && rows.every((row) => listSelected.has(row.id));
  const someListSelected = listSelected.size > 0;

  function togglePick(id: string) {
    setPickSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleListRow(id: string) {
    setListSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllList() {
    if (allListSelected) {
      setListSelected(new Set());
      return;
    }
    setListSelected(new Set(rows.map((row) => row.id)));
  }

  async function handleAdd() {
    const ids = [...pickSelected];
    if (ids.length === 0) {
      setError("Select at least one item to add.");
      return;
    }
    setError("");
    await onAddSelected(ids);
    setPickSelected(new Set());
  }

  async function handleRemove() {
    const ids = [...listSelected];
    if (ids.length === 0) return;
    await onRemoveSelected(ids);
    setListSelected(new Set());
  }

  function renderOption(option: PickListOption) {
    return (
      <label
        key={option.id}
        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
      >
        <input
          type="checkbox"
          className="size-4 rounded border-input"
          checked={pickSelected.has(option.id)}
          disabled={busy}
          onChange={() => togglePick(option.id)}
        />
        <span className="min-w-0 truncate">{option.label}</span>
      </label>
    );
  }

  if (readOnly) {
    if (rows.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">{emptyListMessage}</p>
      );
    }
    return (
      <ul className="divide-y rounded-md border">
        {rows.map((row) => (
          <li key={row.id} className="px-3 py-2.5 text-sm">
            {row.label}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-4">
      {rows.length > 0 ? (
        <div className="overflow-hidden rounded-md border">
          <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={allListSelected}
              onChange={toggleAllList}
              disabled={busy}
              aria-label="Select all items"
            />
            {someListSelected ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-destructive hover:text-destructive"
                disabled={busy}
                onClick={() => void handleRemove()}
              >
                <Trash2 className="size-3.5" />
                Remove selected ({listSelected.size})
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                Select items to remove
              </span>
            )}
          </div>
          <ul className="divide-y">
            {rows.map((row) => (
              <li
                key={row.id}
                className={cn(
                  "flex items-start gap-3 px-3 py-2.5 text-sm",
                  listSelected.has(row.id) && "bg-primary/5",
                )}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 rounded border-input"
                  checked={listSelected.has(row.id)}
                  disabled={busy}
                  onChange={() => toggleListRow(row.id)}
                  aria-label="Select row"
                />
                <div className="min-w-0 flex-1">{row.label}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyListMessage}</p>
      )}

      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium">{addPanelTitle}</p>
        {options.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {emptyOptionsMessage ??
              `All ${availableLabel.toLowerCase()} from the list are already on this event.`}
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {availableLabel}
            </p>
            <div className="max-h-48 overflow-y-auto rounded-md border bg-background p-1">
              {[...grouped.entries()].map(([group, groupOptions]) => (
                <div key={group} className="py-1">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group}
                  </p>
                  {groupOptions.map(renderOption)}
                </div>
              ))}
              {ungrouped.length > 0 ? (
                <div className="py-1">
                  {grouped.size > 0 ? (
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Other
                    </p>
                  ) : null}
                  {ungrouped.map(renderOption)}
                </div>
              ) : null}
            </div>
          </div>
        )}
        {addExtras}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy || pickSelected.size === 0}
            className="gap-1.5"
            onClick={() => void handleAdd()}
          >
            <Plus className="size-4" />
            Add selected
            {pickSelected.size > 0 ? ` (${pickSelected.size})` : ""}
          </Button>
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
