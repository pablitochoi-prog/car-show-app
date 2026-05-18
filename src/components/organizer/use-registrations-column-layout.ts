"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RegistrationColumnKey =
  | "status"
  | "name"
  | "tier"
  | "cars"
  | "fee"
  | "collected"
  | "due";

export const DEFAULT_REGISTRATION_COLUMN_WIDTHS: Record<
  RegistrationColumnKey,
  number
> = {
  status: 140,
  name: 180,
  tier: 120,
  cars: 72,
  fee: 110,
  collected: 110,
  due: 120,
};

const MIN_COLUMN_WIDTH = 56;

export function useRegistrationsColumnLayout() {
  const [widths, setWidths] = useState(DEFAULT_REGISTRATION_COLUMN_WIDTHS);
  const resizeRef = useRef<{
    column: RegistrationColumnKey;
    startX: number;
    startWidth: number;
  } | null>(null);

  const onResizeStart = useCallback(
    (column: RegistrationColumnKey, clientX: number) => {
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
