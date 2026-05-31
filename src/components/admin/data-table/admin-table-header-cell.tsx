"use client";

import { AdminColumnMenu } from "./admin-column-menu";
import type { AdminSortDir } from "@/lib/admin-table/types";

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
  onSort,
  onFilter,
  onClearFilter,
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
  onSort: (dir: AdminSortDir) => void;
  onFilter: (value: string, valueTo?: string) => void;
  onClearFilter: () => void;
}) {
  return (
    <th
      className="relative px-4 py-2"
      style={width ? { width, minWidth: width } : undefined}
      aria-sort={
        activeSortDir === "asc"
          ? "ascending"
          : activeSortDir === "desc"
            ? "descending"
            : "none"
      }
    >
      <div className="flex items-center gap-1">
        <span className="truncate">{label}</span>
        {(sortable || filterable) ? (
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
          />
        ) : null}
      </div>
      {onResizeStart ? (
        <button
          type="button"
          aria-label={`Resize ${label} column`}
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/40"
          onMouseDown={onResizeStart}
        />
      ) : null}
    </th>
  );
}
