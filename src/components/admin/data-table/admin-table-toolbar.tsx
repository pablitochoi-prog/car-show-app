"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AdminTableToolbar({
  qInput,
  onQChange,
  loading,
  placeholder,
  activeFilterCount,
  onClearAllFilters,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
  columnOptions,
}: {
  qInput: string;
  onQChange: (q: string) => void;
  loading: boolean;
  placeholder: string;
  activeFilterCount: number;
  onClearAllFilters: () => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  columnOptions?: { id: string; label: string; visible: boolean; onToggle: (v: boolean) => void }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[12rem] flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={qInput}
          onChange={(e) => onQChange(e.target.value)}
          placeholder={placeholder}
          className="pl-8 text-sm"
          disabled={loading}
          aria-label="Search table"
        />
      </div>
      {activeFilterCount > 0 ? (
        <>
          <Badge variant="secondary">
            {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active
          </Badge>
          <Button type="button" variant="ghost" size="sm" onClick={onClearAllFilters}>
            Clear all filters
          </Button>
        </>
      ) : null}
      <select
        className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        value={pageSize}
        aria-label="Rows per page"
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
      >
        {pageSizeOptions.map((size) => (
          <option key={size} value={size}>
            {size} / page
          </option>
        ))}
      </select>
      {columnOptions && columnOptions.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-9 items-center rounded-md border border-input px-3 text-sm hover:bg-muted">
            Columns
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {columnOptions.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={col.visible}
                onCheckedChange={(checked) => col.onToggle(checked === true)}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

export function AdminTablePagination({
  page,
  totalPages,
  total,
  pageSize,
  loading,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <p>
        {total === 0
          ? "No results"
          : `Showing ${start}–${end} of ${total}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span>
          Page {page} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function AdminTableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b last:border-0">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 animate-pulse rounded bg-muted" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
