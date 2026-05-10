"use client";

import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

export type SortDir = "asc" | "desc" | null;
export type SortState<K extends string> = { key: K; dir: SortDir };

export function nextSort<K extends string>(
  current: SortState<K>,
  key: K,
): SortState<K> {
  if (current.key !== key) return { key, dir: "asc" };
  if (current.dir === "asc") return { key, dir: "desc" };
  return { key, dir: null };
}

export function sortRows<T>(
  rows: T[],
  key: string | null,
  dir: SortDir,
): T[] {
  if (!key || !dir) return rows;
  return [...rows].sort((a, b) => {
    const av = (a as Record<string, unknown>)[key];
    const bv = (b as Record<string, unknown>)[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number")
      return dir === "asc" ? av - bv : bv - av;
    const as = String(av).toLowerCase();
    const bs = String(bv).toLowerCase();
    const cmp = as.localeCompare(bs);
    return dir === "asc" ? cmp : -cmp;
  });
}

export function SortableHeader<K extends string>({
  label,
  sortKey,
  current,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: K;
  current: SortState<K>;
  onSort: (s: SortState<K>) => void;
  className?: string;
}) {
  const active = current.key === sortKey && current.dir !== null;
  return (
    <th
      className={`cursor-pointer select-none px-4 py-2 ${className}`}
      onClick={() => onSort(nextSort(current, sortKey))}
      aria-sort={
        active
          ? current.dir === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          current.dir === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-40" />
        )}
      </span>
    </th>
  );
}
