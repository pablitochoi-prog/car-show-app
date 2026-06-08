"use client";

import { AdminColumnMenu } from "./admin-column-menu";
import type { AdminSortDir } from "@/lib/admin-table/types";
import type { TextFilterMode } from "@/lib/admin-table/text-filter";

export function AdminTableHeaderCell({
  label,
  columnId,
  sortable,
  filterable,
  filterType,
  enumOptions,
  activeSortDir,
  filterValue,
  filterValueTo,
  dateRange,
  width,
  onResizeStart,
  align = "left",
  compact = false,
  headerTitle,
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
  activeSortDir: AdminSortDir | null;
  filterValue?: string;
  filterValueTo?: string;
  dateRange?: boolean;
  width?: number;
  onResizeStart?: (e: React.MouseEvent) => void;
  align?: "left" | "center" | "right";
  compact?: boolean;
  headerTitle?: string;
  onSort: (dir: AdminSortDir) => void;
  onFilter: (value: string, valueTo?: string) => void;
  onClearFilter: () => void;
  onHide?: () => void;
  canHide?: boolean;
  textMatchModes?: readonly TextFilterMode[];
}) {
  const showMenu = sortable || filterable || (canHide && onHide);

  return (
    <th
      className={`relative select-none ${compact ? "px-1.5 py-1" : "px-3 py-2"} ${
        align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
      }`}
      style={width ? { width, minWidth: width, maxWidth: width } : undefined}
      title={headerTitle}
      aria-label={headerTitle ?? label}
      aria-sort={
        activeSortDir === "asc"
          ? "ascending"
          : activeSortDir === "desc"
            ? "descending"
            : "none"
      }
    >
      <div
        className={`flex items-center gap-0.5 pr-1 ${
          align === "center"
            ? "justify-center"
            : align === "right"
              ? "justify-end"
              : ""
        }`}
      >
        <span className="truncate">{label}</span>
        {showMenu ? (
          <AdminColumnMenu
            label={label}
            columnId={columnId}
            sortable={sortable}
            filterable={filterable}
            filterType={filterType}
            enumOptions={enumOptions}
            sortDir={activeSortDir}
            filterValue={filterValue}
            filterValueTo={filterValueTo}
            dateRange={dateRange}
            onSort={onSort}
            onFilter={onFilter}
            onClearFilter={onClearFilter}
            onHide={onHide}
            canHide={canHide}
            textMatchModes={textMatchModes}
          />
        ) : null}
      </div>
      {onResizeStart ? (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${label} column`}
          className="absolute -right-px top-0 z-10 h-full w-2 cursor-col-resize touch-none hover:bg-primary/30 active:bg-primary/50"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onResizeStart(e);
          }}
        />
      ) : null}
    </th>
  );
}
