"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { OrganizerJudgeScoreSheetMatrix } from "@/lib/judging/organizer-judge-score-sheet-matrix";

const SUBCATEGORY_COL_KEY = "__subcategory__";
const MIN_SUBCATEGORY_WIDTH = 140;
const MAX_SUBCATEGORY_WIDTH = 480;
const MAX_VEHICLE_COL_WIDTH = 320;
const MIN_VEHICLE_WIDTH = 52;
const DEFAULT_SUBCATEGORY_WIDTH = 200;

function defaultVehicleWidth(vehicleCount: number): number {
  if (vehicleCount > 15) return 64;
  if (vehicleCount > 8) return 76;
  return 92;
}

function useResizableColumns(
  columnSignature: string,
  defaults: Record<string, number>,
) {
  const [widths, setWidths] = useState<Record<string, number>>(defaults);

  useEffect(() => {
    setWidths(defaults);
  }, [columnSignature, defaults]);

  const startResize = useCallback(
    (
      key: string,
      minWidth: number,
      maxWidth: number,
      startX: number,
      currentWidth: number,
    ) => {
      const onMove = (event: MouseEvent) => {
        const next = Math.min(
          maxWidth,
          Math.max(minWidth, currentWidth + event.clientX - startX),
        );
        setWidths((prev) => ({ ...prev, [key]: next }));
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [],
  );

  return { widths, startResize };
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
      className="absolute -right-1 top-0 z-30 h-full w-3 cursor-col-resize touch-none select-none hover:bg-primary/30"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onResizeStart(event.clientX);
      }}
    />
  );
}

export function OrganizerJudgeScoreSheetMatrixTable({
  matrix,
}: {
  matrix: OrganizerJudgeScoreSheetMatrix;
}) {
  const vehicleDefault = defaultVehicleWidth(matrix.vehicles.length);

  const defaultWidths = useMemo(() => {
    const next: Record<string, number> = {
      [SUBCATEGORY_COL_KEY]: DEFAULT_SUBCATEGORY_WIDTH,
    };
    for (const vehicle of matrix.vehicles) {
      next[vehicle.vehicleEntryCode] = vehicleDefault;
    }
    return next;
  }, [matrix.vehicles, vehicleDefault]);

  const columnSignature = useMemo(
    () =>
      [SUBCATEGORY_COL_KEY, ...matrix.vehicles.map((v) => v.vehicleEntryCode)].join(
        "|",
      ),
    [matrix.vehicles],
  );

  const { widths, startResize } = useResizableColumns(
    columnSignature,
    defaultWidths,
  );

  const subcategoryWidth =
    widths[SUBCATEGORY_COL_KEY] ?? DEFAULT_SUBCATEGORY_WIDTH;

  const tableWidth =
    subcategoryWidth +
    matrix.vehicles.reduce(
      (sum, vehicle) =>
        sum + (widths[vehicle.vehicleEntryCode] ?? vehicleDefault),
      0,
    );

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Drag the right edge of a column header to resize. Narrow vehicle columns
        when judging many vehicles.
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <table
          className="border-collapse text-sm"
          style={{ width: tableWidth, minWidth: "100%", tableLayout: "fixed" }}
        >
          <colgroup>
            <col style={{ width: subcategoryWidth }} />
            {matrix.vehicles.map((vehicle) => (
              <col
                key={vehicle.vehicleEntryCode}
                style={{ width: widths[vehicle.vehicleEntryCode] }}
              />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-20 bg-muted/40">
            <tr className="border-b bg-muted/40">
              <th
                className="relative sticky left-0 z-30 border-r bg-muted/40 px-2 py-1.5 pr-3 text-left align-top font-medium"
                style={{ width: subcategoryWidth, minWidth: subcategoryWidth }}
              >
                Subcategory
                <ColumnResizeHandle
                  onResizeStart={(x) =>
                    startResize(
                      SUBCATEGORY_COL_KEY,
                      MIN_SUBCATEGORY_WIDTH,
                      MAX_SUBCATEGORY_WIDTH,
                      x,
                      subcategoryWidth,
                    )
                  }
                />
              </th>
              {matrix.vehicles.map((vehicle) => (
                <th
                  key={vehicle.vehicleEntryCode}
                  className="relative px-1.5 py-1.5 text-center align-top font-medium"
                  style={{
                    width: widths[vehicle.vehicleEntryCode] ?? vehicleDefault,
                  }}
                  title={`${vehicle.vehicleEntryCode} · ${vehicle.year} ${vehicle.make} ${vehicle.model} · ${vehicle.ownerName ?? "—"}`}
                >
                  <span className="block truncate font-mono text-[0.65rem] leading-tight">
                    {vehicle.vehicleEntryCode}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.65rem] font-normal leading-tight text-muted-foreground">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.65rem] font-normal leading-tight text-muted-foreground">
                    {vehicle.ownerName ?? "—"}
                  </span>
                  <ColumnResizeHandle
                    onResizeStart={(x) =>
                      startResize(
                        vehicle.vehicleEntryCode,
                        MIN_VEHICLE_WIDTH,
                        MAX_VEHICLE_COL_WIDTH,
                        x,
                        widths[vehicle.vehicleEntryCode] ?? vehicleDefault,
                      )
                    }
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => {
              if (row.kind === "total") {
                return (
                  <tr
                    key="total-score"
                    className="border-b bg-primary/10 font-semibold"
                  >
                    <td
                      className="sticky left-0 z-10 border-r bg-primary/10 px-2 py-1.5 text-xs uppercase tracking-wide"
                      style={{ width: subcategoryWidth, minWidth: subcategoryWidth }}
                    >
                      Total score
                    </td>
                    {matrix.vehicles.map((vehicle) => (
                      <td
                        key={`total-${vehicle.vehicleEntryCode}`}
                        className="truncate px-1.5 py-1.5 text-center align-top text-xs font-bold tabular-nums text-primary"
                      >
                        {row.scoresByVehicle[vehicle.vehicleEntryCode] ?? "—"}
                      </td>
                    ))}
                  </tr>
                );
              }

              if (row.kind === "section") {
                return (
                  <tr
                    key={`section-${row.sectionSortOrder}`}
                    className="bg-muted/30"
                  >
                    <td
                      colSpan={matrix.vehicles.length + 1}
                      className="sticky left-0 px-2 py-1.5 text-xs font-bold uppercase tracking-wide"
                    >
                      {row.sectionName}
                    </td>
                  </tr>
                );
              }

              if (row.kind === "subtotal") {
                return (
                  <tr
                    key={`subtotal-${row.sectionSortOrder}`}
                    className="border-b border-t bg-muted/20 font-semibold"
                  >
                    <td
                      className="sticky left-0 z-10 border-r bg-muted/20 px-2 py-1.5 text-xs"
                      style={{ width: subcategoryWidth, minWidth: subcategoryWidth }}
                    >
                      Section subtotal
                    </td>
                    {matrix.vehicles.map((vehicle) => (
                      <td
                        key={`subtotal-${row.sectionSortOrder}-${vehicle.vehicleEntryCode}`}
                        className="truncate px-1.5 py-1.5 text-center align-top text-xs font-bold tabular-nums text-primary"
                      >
                        {row.scoresByVehicle[vehicle.vehicleEntryCode] ?? "—"}
                      </td>
                    ))}
                  </tr>
                );
              }

              return (
                <tr key={row.rowKey} className="border-b last:border-0">
                  <td
                    className={cn(
                      "sticky left-0 z-10 border-r bg-background px-2 py-1 align-top leading-snug",
                      row.isIndented ? "pl-5" : "pl-3",
                    )}
                    style={{ width: subcategoryWidth, minWidth: subcategoryWidth }}
                  >
                    <span className="whitespace-pre-wrap break-words font-medium">
                      {row.label}
                      <span className="ml-1.5 whitespace-nowrap text-xs font-normal text-muted-foreground">
                        (max {row.maxPoints})
                      </span>
                    </span>
                  </td>
                  {matrix.vehicles.map((vehicle) => {
                    const value =
                      row.deductionsByVehicle[vehicle.vehicleEntryCode] ?? "";
                    return (
                      <td
                        key={`${row.rowKey}-${vehicle.vehicleEntryCode}`}
                        className="px-1.5 py-1 text-center align-top tabular-nums"
                      >
                        {value ? (
                          <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                            {value}
                          </span>
                        ) : (
                          <span className="text-muted-foreground"> </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
