"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VehicleRegistrationsFixedColumnKey =
  | "select"
  | "photo"
  | "vehicleId"
  | "year"
  | "make"
  | "model"
  | "vin"
  | "vehicleClass"
  | "owner";

export function categoryColumnKey(sectionId: string): string {
  return `category:${sectionId}`;
}

const DEFAULT_FIXED_WIDTHS: Record<VehicleRegistrationsFixedColumnKey, number> = {
  select: 44,
  photo: 72,
  vehicleId: 96,
  year: 72,
  make: 100,
  model: 110,
  vin: 120,
  vehicleClass: 140,
  owner: 140,
};

const DEFAULT_CATEGORY_WIDTH = 128;
const MIN_COLUMN_WIDTH = 48;

export function useVehicleRegistrationsColumnLayout(categorySectionIds: string[]) {
  const [fixedWidths, setFixedWidths] = useState(DEFAULT_FIXED_WIDTHS);
  const [categoryWidths, setCategoryWidths] = useState<Record<string, number>>({});

  useEffect(() => {
    setCategoryWidths((prev) => {
      const next = { ...prev };
      for (const id of categorySectionIds) {
        const key = categoryColumnKey(id);
        if (next[key] == null) next[key] = DEFAULT_CATEGORY_WIDTH;
      }
      return next;
    });
  }, [categorySectionIds]);

  const resizeRef = useRef<{
    column: string;
    startX: number;
    startWidth: number;
    isCategory: boolean;
  } | null>(null);

  const onResizeStart = useCallback(
    (column: string, clientX: number, isCategory: boolean) => {
      const startWidth = isCategory
        ? (categoryWidths[column] ?? DEFAULT_CATEGORY_WIDTH)
        : fixedWidths[column as VehicleRegistrationsFixedColumnKey];
      resizeRef.current = {
        column,
        startX: clientX,
        startWidth,
        isCategory,
      };
    },
    [categoryWidths, fixedWidths],
  );

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const r = resizeRef.current;
      if (!r) return;
      const next = Math.max(MIN_COLUMN_WIDTH, r.startWidth + (e.clientX - r.startX));
      if (r.isCategory) {
        setCategoryWidths((prev) => ({ ...prev, [r.column]: next }));
      } else {
        setFixedWidths((prev) => ({
          ...prev,
          [r.column as VehicleRegistrationsFixedColumnKey]: next,
        }));
      }
    }

    function onUp() {
      resizeRef.current = null;
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  function widthFor(column: VehicleRegistrationsFixedColumnKey): number {
    return fixedWidths[column];
  }

  function widthForCategory(sectionId: string): number {
    return categoryWidths[categoryColumnKey(sectionId)] ?? DEFAULT_CATEGORY_WIDTH;
  }

  return { widthFor, widthForCategory, onResizeStart };
}
