"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ColumnLayoutState = {
  hidden: Record<string, boolean>;
  widths: Record<string, number>;
};

const DEFAULT_MIN_WIDTH = 72;

export function useAdminTableColumns(
  tableId: string,
  columnIds: string[],
  defaults?: { minWidth?: Record<string, number> },
) {
  const storageKey = `admin-table:${tableId}:layout:v2`;
  const layoutRef = useRef<ColumnLayoutState>({ hidden: {}, widths: {} });

  const [layout, setLayout] = useState<ColumnLayoutState>(() => ({
    hidden: {},
    widths: {},
  }));

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

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
      layoutRef.current = next;
      setLayout(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [storageKey],
  );

  const minWidthFor = useCallback(
    (columnId: string) => defaults?.minWidth?.[columnId] ?? DEFAULT_MIN_WIDTH,
    [defaults?.minWidth],
  );

  const isVisible = useCallback(
    (columnId: string) => !layout.hidden[columnId],
    [layout.hidden],
  );

  const toggleColumn = useCallback(
    (columnId: string, visible: boolean) => {
      persist({
        ...layoutRef.current,
        hidden: { ...layoutRef.current.hidden, [columnId]: !visible },
      });
    },
    [persist],
  );

  const hideColumn = useCallback(
    (columnId: string) => {
      persist({
        ...layoutRef.current,
        hidden: { ...layoutRef.current.hidden, [columnId]: true },
      });
    },
    [persist],
  );

  const setColumnWidth = useCallback(
    (columnId: string, width: number) => {
      persist({
        ...layoutRef.current,
        widths: {
          ...layoutRef.current.widths,
          [columnId]: Math.max(width, minWidthFor(columnId)),
        },
      });
    },
    [minWidthFor, persist],
  );

  const beginColumnResize = useCallback(
    (columnId: string, clientX: number) => {
      const startWidth = layoutRef.current.widths[columnId] ?? minWidthFor(columnId);

      const onMove = (e: MouseEvent) => {
        setColumnWidth(columnId, startWidth + (e.clientX - clientX));
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
    [minWidthFor, setColumnWidth],
  );

  const visibleColumnIds = columnIds.filter((id) => isVisible(id));

  return {
    isVisible,
    toggleColumn,
    hideColumn,
    setColumnWidth,
    beginColumnResize,
    visibleColumnIds,
    columnWidth: (id: string) =>
      layout.widths[id] ?? minWidthFor(id),
  };
}
