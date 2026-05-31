"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  EyeOff,
  Filter,
  ListFilter,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdminSortDir } from "@/lib/admin-table/types";

export function AdminColumnMenu({
  label,
  columnId,
  sortable,
  filterable,
  filterType = "text",
  enumOptions,
  sortDir,
  filterValue,
  filterValueTo,
  dateRange,
  onSort,
  onFilter,
  onClearFilter,
  onHide,
  canHide = true,
}: {
  label: string;
  columnId: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: "text" | "enum" | "dateFrom" | "dateTo";
  enumOptions?: { value: string; label: string }[];
  sortDir: AdminSortDir | null;
  filterValue?: string;
  filterValueTo?: string;
  dateRange?: boolean;
  onSort: (dir: AdminSortDir) => void;
  onFilter: (value: string, valueTo?: string) => void;
  onClearFilter: () => void;
  onHide?: () => void;
  canHide?: boolean;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState(filterValue ?? "");
  const [draftTo, setDraftTo] = useState(filterValueTo ?? "");
  const hasFilter = Boolean(filterValue?.trim() || filterValueTo?.trim());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Column options for ${label}`}
      >
        {hasFilter ? (
          <Filter className="size-3.5 text-primary" aria-hidden />
        ) : (
          <ListFilter className="size-3.5 opacity-60" aria-hidden />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {sortable ? (
          <>
            <DropdownMenuItem onClick={() => onSort("asc")}>
              <ArrowUp className="mr-2 size-3.5" />
              Sort ascending
              {sortDir === "asc" ? " ✓" : ""}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort("desc")}>
              <ArrowDown className="mr-2 size-3.5" />
              Sort descending
              {sortDir === "desc" ? " ✓" : ""}
            </DropdownMenuItem>
          </>
        ) : null}
        {sortable && filterable ? <DropdownMenuSeparator /> : null}
        {filterable ? (
          filterOpen ? (
            <div className="space-y-2 p-2" onClick={(e) => e.stopPropagation()}>
              {filterType === "enum" && enumOptions ? (
                <select
                  className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  value={draft}
                  aria-label={`Filter ${label}`}
                  onChange={(e) => setDraft(e.target.value)}
                >
                  <option value="">All</option>
                  {enumOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : dateRange ? (
                <>
                  <Input
                    type="date"
                    value={draft}
                    aria-label={`Filter ${label} from`}
                    className="h-8 text-sm"
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <Input
                    type="date"
                    value={draftTo}
                    aria-label={`Filter ${label} to`}
                    className="h-8 text-sm"
                    onChange={(e) => setDraftTo(e.target.value)}
                  />
                </>
              ) : (
                <Input
                  type={filterType === "dateFrom" || filterType === "dateTo" ? "date" : "text"}
                  value={draft}
                  aria-label={`Filter ${label}`}
                  placeholder={
                    filterType === "dateFrom"
                      ? "From date"
                      : filterType === "dateTo"
                        ? "To date"
                        : "Contains…"
                  }
                  className="h-8 text-sm"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onFilter(draft);
                      setFilterOpen(false);
                    }
                  }}
                />
              )}
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  onClick={() => {
                    onFilter(draft, dateRange ? draftTo : undefined);
                    setFilterOpen(false);
                  }}
                >
                  Apply
                </Button>
                {hasFilter ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    aria-label={`Clear filter for ${label}`}
                    onClick={() => {
                      setDraft("");
                      setDraftTo("");
                      onClearFilter();
                      setFilterOpen(false);
                    }}
                  >
                    <X className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <DropdownMenuItem onClick={() => setFilterOpen(true)}>
                <Filter className="mr-2 size-3.5" />
                Filter this column
              </DropdownMenuItem>
              {hasFilter ? (
                <DropdownMenuItem
                  onClick={() => {
                    setDraft("");
                    setDraftTo("");
                    onClearFilter();
                  }}
                >
                  <X className="mr-2 size-3.5" />
                  Clear filter
                </DropdownMenuItem>
              ) : null}
            </>
          )
        ) : null}
        {canHide && onHide ? (
          <>
            {(sortable || filterable) ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem onClick={onHide}>
              <EyeOff className="mr-2 size-3.5" />
              Hide this column
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
