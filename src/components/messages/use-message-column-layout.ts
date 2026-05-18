"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MessageColumnKey = "contact" | "subject" | "event" | "date";

/** Default pixel widths: subject +20%, event −20% vs prior 40% / 22% split at 720px. */
export const DEFAULT_MESSAGE_COLUMN_WIDTHS: Record<MessageColumnKey, number> = {
  contact: 122,
  subject: 326,
  event: 120,
  date: 96,
};

const MIN_COLUMN_WIDTH = 56;

export function useMessageColumnLayout() {
  const [widths, setWidths] = useState(DEFAULT_MESSAGE_COLUMN_WIDTHS);
  const resizeRef = useRef<{
    column: MessageColumnKey;
    startX: number;
    startWidth: number;
  } | null>(null);

  const onResizeStart = useCallback(
    (column: MessageColumnKey, clientX: number) => {
      resizeRef.current = {
        column,
        startX: clientX,
        startWidth: widths[column],
      };
    },
    [widths],
  );

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const r = resizeRef.current;
      if (!r) return;
      const next = Math.max(
        MIN_COLUMN_WIDTH,
        r.startWidth + (e.clientX - r.startX),
      );
      setWidths((prev) => ({ ...prev, [r.column]: next }));
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

  return { widths, onResizeStart };
}
