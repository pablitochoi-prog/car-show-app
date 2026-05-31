"use client";

import { useCallback, useEffect, useState } from "react";

export type ColumnLayoutState = {
  hidden: Record<string, boolean>;
  widths: Record<string, number>;
};

const DEFAULT_MIN_WIDTH = 96;

export function useAdminTableColumns(
  tableId: string,
  columnIds: string[],
  defaults?: { minWidth?: Record<string, number> },
) {
  const storageKey = `admin-table:${tableId}:layout`;

  const [layout, setLayout] = useState<ColumnLayoutState>(() => ({
    hidden: {},
    widths: {},
  }));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setLayout(JSON.parse(raw) as ColumnLayoutState);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: ColumnLayoutState) => {
      setLayout(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [storageKey],
  );

  const isVisible = useCallback(
    (columnId: string) => !layout.hidden[columnId],
    [layout.hidden],
  );

  const toggleColumn = useCallback(
    (columnId: string, visible: boolean) => {
      persist({
        ...layout,
        hidden: { ...layout.hidden, [columnId]: !visible },
      });
    },
    [layout, persist],
  );

  const setColumnWidth = useCallback(
    (columnId: string, width: number) => {
      persist({
        ...layout,
        widths: {
          ...layout.widths,
          [columnId]: Math.max(width, defaults?.minWidth?.[columnId] ?? DEFAULT_MIN_WIDTH),
        },
      });
    },
    [defaults?.minWidth, layout, persist],
  );

  const visibleColumnIds = columnIds.filter((id) => isVisible(id));

  return {
    isVisible,
    toggleColumn,
    setColumnWidth,
    visibleColumnIds,
    columnWidth: (id: string) =>
      layout.widths[id] ?? defaults?.minWidth?.[id] ?? DEFAULT_MIN_WIDTH,
  };
}
