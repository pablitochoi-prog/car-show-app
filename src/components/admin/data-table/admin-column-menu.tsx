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
import {
  encodeTextFilter,
  parseTextFilter,
  TEXT_FILTER_MODES,
  TEXT_FILTER_MODE_LABELS,
  type TextFilterMode,
} from "@/lib/admin-table/text-filter";

/** Keep keyboard/pointer events inside filter fields instead of menu typeahead. */
function keepFilterFieldFocus(
  event: React.KeyboardEvent | React.PointerEvent,
) {
  event.stopPropagation();
}

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
  textMatchModes,
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
  textMatchModes?: readonly TextFilterMode[];
  onSort: (dir: AdminSortDir) => void;
  onFilter: (value: string, valueTo?: string) => void;
  onClearFilter: () => void;
  onHide?: () => void;
  canHide?: boolean;
}) {
  const parsed = parseTextFilter(filterValue ?? "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftMode, setDraftMode] = useState<TextFilterMode>(parsed.mode);
  const [draft, setDraft] = useState(parsed.value);
  const [draftTo, setDraftTo] = useState(filterValueTo ?? "");
  const hasFilter = Boolean(filterValue?.trim() || filterValueTo?.trim());
  const modes = textMatchModes ?? TEXT_FILTER_MODES;
  const useAdvancedTextFilter = Boolean(textMatchModes?.length);

  function closeMenu() {
    setMenuOpen(false);
    setFilterOpen(false);
  }

  function openFilterPanel() {
    const next = parseTextFilter(filterValue ?? "");
    setDraftMode(next.mode);
    setDraft(next.value);
    setFilterOpen(true);
    setMenuOpen(true);
  }

  return (
    <DropdownMenu
      open={menuOpen}
      modal={false}
      onOpenChange={(open) => {
        setMenuOpen(open);
        if (!open) setFilterOpen(false);
      }}
    >
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
            <div
              className="space-y-2 p-2"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.preventDefault()}
              onKeyDown={keepFilterFieldFocus}
            >
              {useAdvancedTextFilter ? (
                <>
                  <select
                    className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                    value={draftMode}
                    aria-label={`Match type for ${label}`}
                    onChange={(e) => setDraftMode(e.target.value as TextFilterMode)}
                    onKeyDown={keepFilterFieldFocus}
                    onPointerDown={keepFilterFieldFocus}
                  >
                    {modes.map((mode) => (
                      <option key={mode} value={mode}>
                        {TEXT_FILTER_MODE_LABELS[mode]}
                      </option>
                    ))}
                  </select>
                  {filterType === "enum" &&
                  enumOptions &&
                  draftMode === "equals" ? (
                    <select
                      className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                      value={draft}
                      aria-label={`Filter ${label}`}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={keepFilterFieldFocus}
                      onPointerDown={keepFilterFieldFocus}
                    >
                      <option value="">Select…</option>
                      {enumOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type="text"
                      value={draft}
                      aria-label={`Filter ${label}`}
                      placeholder="Value…"
                      className="h-8 text-sm"
                      autoFocus
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        keepFilterFieldFocus(e);
                        if (e.key === "Enter") {
                          onFilter(encodeTextFilter(draftMode, draft));
                          closeMenu();
                        }
                      }}
                      onPointerDown={keepFilterFieldFocus}
                    />
                  )}
                </>
              ) : filterType === "enum" && enumOptions ? (
                <select
                  className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  value={draft}
                  aria-label={`Filter ${label}`}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={keepFilterFieldFocus}
                  onPointerDown={keepFilterFieldFocus}
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
                    onKeyDown={keepFilterFieldFocus}
                    onPointerDown={keepFilterFieldFocus}
                  />
                  <Input
                    type="date"
                    value={draftTo}
                    aria-label={`Filter ${label} to`}
                    className="h-8 text-sm"
                    onChange={(e) => setDraftTo(e.target.value)}
                    onKeyDown={keepFilterFieldFocus}
                    onPointerDown={keepFilterFieldFocus}
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
                    keepFilterFieldFocus(e);
                    if (e.key === "Enter") {
                      onFilter(draft);
                      closeMenu();
                    }
                  }}
                  onPointerDown={keepFilterFieldFocus}
                />
              )}
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  onClick={() => {
                    if (useAdvancedTextFilter) {
                      onFilter(encodeTextFilter(draftMode, draft));
                    } else {
                      onFilter(draft, dateRange ? draftTo : undefined);
                    }
                    closeMenu();
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
                      setDraftMode("contains");
                      onClearFilter();
                      closeMenu();
                    }}
                  >
                    <X className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <DropdownMenuItem closeOnClick={false} onClick={openFilterPanel}>
                <Filter className="mr-2 size-3.5" />
                Filter this column
              </DropdownMenuItem>
              {hasFilter ? (
                <DropdownMenuItem
                  onClick={() => {
                    setDraft("");
                    setDraftTo("");
                    setDraftMode("contains");
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
