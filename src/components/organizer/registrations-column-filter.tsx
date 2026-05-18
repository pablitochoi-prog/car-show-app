"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ListFilter } from "lucide-react";

/** null = no filter (show all values). */
export type ColumnFilterValue = Set<string> | null;

export function useColumnFilterOptions<T>(
  rows: T[],
  getValue: (row: T) => string,
): string[] {
  return useMemo(() => {
    const values = new Set<string>();
    for (const row of rows) {
      const v = getValue(row).trim();
      if (v) values.add(v);
    }
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [rows, getValue]);
}

export function applyColumnFilters<T>(
  rows: T[],
  filters: { getValue: (row: T) => string; selected: ColumnFilterValue }[],
): T[] {
  return rows.filter((row) =>
    filters.every(({ getValue, selected }) => {
      if (!selected || selected.size === 0) return true;
      return selected.has(getValue(row));
    }),
  );
}

function isOptionChecked(
  option: string,
  options: string[],
  filter: ColumnFilterValue,
): boolean {
  if (!filter) return true;
  return filter.has(option);
}

export function RegistrationsColumnFilter({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: ColumnFilterValue;
  onChange: (next: ColumnFilterValue) => void;
}) {
  const active = value !== null && value.size > 0 && value.size < options.length;

  function toggleOption(option: string) {
    const current = value ?? new Set(options);
    const next = new Set(current);
    if (next.has(option)) {
      next.delete(option);
    } else {
      next.add(option);
    }
    if (next.size === 0 || next.size === options.length) {
      onChange(null);
      return;
    }
    onChange(next);
  }

  if (options.length === 0) return null;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-muted",
          active && "bg-primary/10 text-primary",
        )}
        aria-label={`Filter ${label}`}
        title={`Filter ${label}`}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <ListFilter className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52 p-1">
        <DropdownMenuItem
          className="text-xs text-muted-foreground"
          onClick={() => onChange(null)}
        >
          Show all
        </DropdownMenuItem>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => toggleOption(option)}
          >
            <input
              type="checkbox"
              className="size-3.5 rounded border-input"
              checked={isOptionChecked(option, options, value)}
              readOnly
              tabIndex={-1}
              aria-label={option}
            />
            <span className="min-w-0 truncate">{option}</span>
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RegistrationsFilterSummary({
  visibleCount,
  totalCount,
  hasActiveFilters,
  onClear,
}: {
  visibleCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  onClear: () => void;
}) {
  if (!hasActiveFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>
        Showing {visibleCount} of {totalCount} registration
        {totalCount === 1 ? "" : "s"}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="h-6 px-2"
        onClick={onClear}
      >
        Clear filters
      </Button>
    </div>
  );
}

