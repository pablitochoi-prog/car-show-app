"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  VEHICLE_REGISTRATIONS_UNASSIGNED_JUDGE,
  type VehicleRegistrationsCategoryColumn,
  type VehicleRegistrationsGridRow,
  type VehicleRegistrationsVehicleClass,
} from "@/lib/vehicle-registrations-grid-types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  applyColumnFilters,
  RegistrationsColumnFilter,
  RegistrationsFilterSummary,
  useColumnFilterOptions,
  type ColumnFilterValue,
} from "@/components/organizer/registrations-column-filter";
import {
  categoryColumnKey,
  useVehicleRegistrationsColumnLayout,
  type VehicleRegistrationsFixedColumnKey,
} from "@/components/organizer/use-vehicle-registrations-column-layout";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 50;

const FIXED_COLUMN_COUNT = 9;

type Props = {
  eventId: string;
  scoreSheetJudgingEnabled: boolean;
  categories: VehicleRegistrationsCategoryColumn[];
  vehicleClasses: VehicleRegistrationsVehicleClass[];
  rows: VehicleRegistrationsGridRow[];
  selectedVehicleIds: Set<string>;
  onSelectedVehicleIdsChange: React.Dispatch<React.SetStateAction<Set<string>>>;
  eventCategoryId: string;
  onEventCategoryIdChange: (id: string) => void;
};

function cell(value: string | number | null | undefined) {
  const text =
    value === null || value === undefined || value === ""
      ? "—"
      : String(value);
  return <span className="text-sm">{text}</span>;
}

function judgeDisplay(value: string | null | undefined): string {
  const t = value?.trim();
  return t ? t : VEHICLE_REGISTRATIONS_UNASSIGNED_JUDGE;
}

function ColumnResizeHandle({
  onResizeStart,
}: {
  onResizeStart: (clientX: number) => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
      className="absolute top-0 right-0 z-10 h-full w-1.5 cursor-col-resize touch-none hover:bg-primary/30"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onResizeStart(e.clientX);
      }}
    />
  );
}

function FilterHeader({
  label,
  width,
  filter,
  onResizeStart,
}: {
  label: string;
  width: number;
  filter?: {
    options: string[];
    value: ColumnFilterValue;
    onChange: (next: ColumnFilterValue) => void;
  };
  onResizeStart: (clientX: number) => void;
}) {
  return (
    <th
      className="relative border-r p-0 text-left last:border-r-0"
      style={{ width, minWidth: width }}
    >
      <div className="flex items-center pr-1">
        <span className="min-w-0 flex-1 truncate px-3 py-2.5 text-xs font-medium">
          {label}
        </span>
        {filter ? (
          <RegistrationsColumnFilter
            label={label}
            options={filter.options}
            value={filter.value}
            onChange={filter.onChange}
          />
        ) : null}
      </div>
      <ColumnResizeHandle onResizeStart={onResizeStart} />
    </th>
  );
}

export function VehicleRegistrationsGrid({
  eventId,
  scoreSheetJudgingEnabled,
  categories,
  vehicleClasses,
  rows,
  selectedVehicleIds,
  onSelectedVehicleIdsChange,
  eventCategoryId,
  onEventCategoryIdChange,
}: Props) {
  const sectionIds = useMemo(
    () => categories.map((c) => c.sectionId),
    [categories],
  );
  const { widthFor, widthForCategory, onResizeStart } =
    useVehicleRegistrationsColumnLayout(sectionIds);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [classFilter, setClassFilter] = useState<ColumnFilterValue>(null);
  const [makeFilter, setMakeFilter] = useState<ColumnFilterValue>(null);
  const [modelFilter, setModelFilter] = useState<ColumnFilterValue>(null);
  const [ownerFilter, setOwnerFilter] = useState<ColumnFilterValue>(null);
  const [categoryFilters, setCategoryFilters] = useState<
    Record<string, ColumnFilterValue>
  >({});

  const classScopedRows = useMemo(() => {
    if (!eventCategoryId) return rows;
    return rows.filter((r) => r.eventCategoryId === eventCategoryId);
  }, [rows, eventCategoryId]);

  const getVehicleClass = useCallback(
    (r: VehicleRegistrationsGridRow) =>
      r.vehicleClass?.trim() ? r.vehicleClass : "—",
    [],
  );
  const getMake = useCallback(
    (r: VehicleRegistrationsGridRow) => (r.make?.trim() ? r.make : "—"),
    [],
  );
  const getModel = useCallback(
    (r: VehicleRegistrationsGridRow) => (r.model?.trim() ? r.model : "—"),
    [],
  );
  const getOwner = useCallback(
    (r: VehicleRegistrationsGridRow) => (r.ownerName?.trim() ? r.ownerName : "—"),
    [],
  );

  const classOptions = useColumnFilterOptions(classScopedRows, getVehicleClass);
  const makeOptions = useColumnFilterOptions(classScopedRows, getMake);
  const modelOptions = useColumnFilterOptions(classScopedRows, getModel);
  const ownerOptions = useColumnFilterOptions(classScopedRows, getOwner);

  const categoryFilterOptions = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const col of categories) {
      const values = new Set<string>();
      for (const row of classScopedRows) {
        values.add(judgeDisplay(row.judgeBySectionId[col.sectionId]));
      }
      out[col.sectionId] = [...values].sort((a, b) => a.localeCompare(b));
    }
    return out;
  }, [categories, classScopedRows]);

  const filteredRows = useMemo(() => {
    const categoryRules = categories.map((col) => ({
      getValue: (row: VehicleRegistrationsGridRow) =>
        judgeDisplay(row.judgeBySectionId[col.sectionId]),
      selected: categoryFilters[col.sectionId] ?? null,
    }));
    return applyColumnFilters(classScopedRows, [
      {
        getValue: (r) => (r.vehicleClass?.trim() ? r.vehicleClass : "—"),
        selected: classFilter,
      },
      { getValue: (r) => (r.make?.trim() ? r.make : "—"), selected: makeFilter },
      { getValue: (r) => (r.model?.trim() ? r.model : "—"), selected: modelFilter },
      {
        getValue: (r) => (r.ownerName?.trim() ? r.ownerName : "—"),
        selected: ownerFilter,
      },
      ...categoryRules,
    ]);
  }, [
    classScopedRows,
    categories,
    classFilter,
    makeFilter,
    modelFilter,
    ownerFilter,
    categoryFilters,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [
    eventCategoryId,
    pageSize,
    classFilter,
    makeFilter,
    modelFilter,
    ownerFilter,
    categoryFilters,
  ]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const pageAllSelected =
    pageRows.length > 0 &&
    pageRows.every((r) => selectedVehicleIds.has(r.registrationVehicleId));

  const hasActiveFilters =
    classFilter !== null ||
    makeFilter !== null ||
    modelFilter !== null ||
    ownerFilter !== null ||
    Object.values(categoryFilters).some((f) => f !== null) ||
    eventCategoryId !== "";

  const clearFilters = useCallback(() => {
    setClassFilter(null);
    setMakeFilter(null);
    setModelFilter(null);
    setOwnerFilter(null);
    setCategoryFilters({});
    onEventCategoryIdChange("");
  }, [onEventCategoryIdChange]);

  function togglePageSelection() {
    if (pageAllSelected) {
      const next = new Set(selectedVehicleIds);
      for (const r of pageRows) next.delete(r.registrationVehicleId);
      onSelectedVehicleIdsChange(next);
    } else {
      const next = new Set(selectedVehicleIds);
      for (const r of pageRows) next.add(r.registrationVehicleId);
      onSelectedVehicleIdsChange(next);
    }
  }

  function toggleRow(id: string) {
    const next = new Set(selectedVehicleIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedVehicleIdsChange(next);
  }

  function header(
    label: string,
    column: VehicleRegistrationsFixedColumnKey,
    filter?: {
      options: string[];
      value: ColumnFilterValue;
      onChange: (next: ColumnFilterValue) => void;
    },
  ) {
    return (
      <FilterHeader
        label={label}
        width={widthFor(column)}
        filter={filter}
        onResizeStart={(x) => onResizeStart(column, x, false)}
      />
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        <p>No confirmed vehicle registrations yet.</p>
        <Link
          href={`/organizer/events/${eventId}/registrations`}
          className={cn(buttonVariants({ variant: "link", size: "sm" }), "mt-2")}
        >
          View event registrations
        </Link>
      </div>
    );
  }

  const rangeStart =
    filteredRows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, filteredRows.length);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="vr-class-scope">Vehicle class (scope)</Label>
          <select
            id="vr-class-scope"
            className="flex h-9 min-w-[200px] rounded-md border border-input bg-background px-3 text-sm"
            value={eventCategoryId}
            onChange={(e) => onEventCategoryIdChange(e.target.value)}
          >
            <option value="">All classes</option>
            {(vehicleClasses ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="vr-page-size">Per page</Label>
          <select
            id="vr-page-size"
            className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        {selectedVehicleIds.size > 0 ? (
          <p className="text-sm text-muted-foreground">
            {selectedVehicleIds.size} vehicle
            {selectedVehicleIds.size === 1 ? "" : "s"} selected (across pages)
          </p>
        ) : null}
      </div>

      <RegistrationsFilterSummary
        visibleCount={filteredRows.length}
        totalCount={classScopedRows.length}
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
        entityLabel="vehicle"
      />

      <p className="text-sm text-muted-foreground">
        {filteredRows.length === 0
          ? `No vehicles match filters (${rows.length} total registered)`
          : `Showing ${rangeStart}–${rangeEnd} of ${filteredRows.length} on this page${
              filteredRows.length !== rows.length
                ? ` (${rows.length} total registered)`
                : ""
            }`}
        {scoreSheetJudgingEnabled && categories.length > 0
          ? ` · ${categories.length} judging categor${categories.length === 1 ? "y" : "ies"}`
          : ""}
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th
                className="relative border-r p-0"
                style={{ width: widthFor("select"), minWidth: widthFor("select") }}
              >
                <div className="flex items-center justify-center px-2 py-2.5">
                  <input
                    type="checkbox"
                    checked={pageAllSelected}
                    onChange={togglePageSelection}
                    aria-label="Select all vehicles on this page"
                  />
                </div>
                <ColumnResizeHandle
                  onResizeStart={(x) => onResizeStart("select", x, false)}
                />
              </th>
              {header("Photo", "photo")}
              {header("Vehicle ID", "vehicleId")}
              {header("Year", "year")}
              {header("Make", "make", {
                options: makeOptions,
                value: makeFilter,
                onChange: setMakeFilter,
              })}
              {header("Model", "model", {
                options: modelOptions,
                value: modelFilter,
                onChange: setModelFilter,
              })}
              {header("VIN", "vin")}
              {header("Vehicle class", "vehicleClass", {
                options: classOptions,
                value: classFilter,
                onChange: setClassFilter,
              })}
              {header("Owner", "owner", {
                options: ownerOptions,
                value: ownerFilter,
                onChange: setOwnerFilter,
              })}
              {scoreSheetJudgingEnabled
                ? categories.map((c) => (
                    <FilterHeader
                      key={c.sectionId}
                      label={c.name}
                      width={widthForCategory(c.sectionId)}
                      filter={{
                        options: categoryFilterOptions[c.sectionId] ?? [],
                        value: categoryFilters[c.sectionId] ?? null,
                        onChange: (next) =>
                          setCategoryFilters((prev) => ({
                            ...prev,
                            [c.sectionId]: next,
                          })),
                      }}
                      onResizeStart={(x) =>
                        onResizeStart(categoryColumnKey(c.sectionId), x, true)
                      }
                    />
                  ))
                : null}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    FIXED_COLUMN_COUNT +
                    (scoreSheetJudgingEnabled ? categories.length : 0)
                  }
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  No vehicles match the current filters.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr
                  key={row.registrationVehicleId}
                  className={cn(
                    "border-b last:border-0",
                    selectedVehicleIds.has(row.registrationVehicleId) &&
                      "bg-primary/5",
                  )}
                >
                  <td className="border-r px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedVehicleIds.has(row.registrationVehicleId)}
                      onChange={() => toggleRow(row.registrationVehicleId)}
                      aria-label="Select vehicle"
                    />
                  </td>
                  <td className="border-r px-3 py-2">
                    {row.photoUrl ? (
                      <div className="relative size-12 overflow-hidden rounded-md border bg-muted">
                        <Image
                          src={row.photoUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div
                        className="flex size-12 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground"
                        aria-hidden
                      >
                        —
                      </div>
                    )}
                  </td>
                  <td className="border-r px-3 py-2 font-mono text-xs">
                    {cell(row.publicVehicleId)}
                  </td>
                  <td className="border-r px-3 py-2">{cell(row.year)}</td>
                  <td className="border-r px-3 py-2">{cell(row.make)}</td>
                  <td className="border-r px-3 py-2">{cell(row.model)}</td>
                  <td className="border-r px-3 py-2 font-mono text-xs">
                    {cell(row.vin)}
                  </td>
                  <td className="border-r px-3 py-2">{cell(row.vehicleClass)}</td>
                  <td className="border-r px-3 py-2">{cell(row.ownerName)}</td>
                  {scoreSheetJudgingEnabled
                    ? categories.map((c) => {
                        const judge = row.judgeBySectionId[c.sectionId];
                        const unassigned = !judge?.trim();
                        return (
                          <td
                            key={c.sectionId}
                            className={cn(
                              "border-r px-3 py-2 whitespace-nowrap last:border-r-0",
                              unassigned &&
                                "bg-amber-50/80 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100",
                            )}
                          >
                            {cell(judgeDisplay(judge))}
                          </td>
                        );
                      })
                    : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>
          Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      {scoreSheetJudgingEnabled ? (
        categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add scorecard categories (for example Exterior, Interior) under{" "}
            <Link
              href={`/organizer/events/${eventId}/awards-judging`}
              className="underline underline-offset-2"
            >
              Awards &amp; Judging
            </Link>{" "}
            to show a judge column per category.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Category cells highlighted in amber have no judge assigned. Filter a
            category column by {VEHICLE_REGISTRATIONS_UNASSIGNED_JUDGE} to find
            gaps.
          </p>
        )
      ) : null}
    </div>
  );
}
