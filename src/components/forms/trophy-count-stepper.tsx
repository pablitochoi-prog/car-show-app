"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MIN_TROPHIES = 1;
const MAX_TROPHIES = 20;
const SAVE_DEBOUNCE_MS = 350;

type TrophyCountStepperProps = {
  value: number;
  onChange: (count: number) => void;
  onSave: (count: number) => Promise<void>;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
};

export function TrophyCountStepper({
  value,
  onChange,
  onSave,
  disabled = false,
  id,
  "aria-label": ariaLabel = "Place trophy count",
}: TrophyCountStepperProps) {
  const [display, setDisplay] = useState(value);
  const [status, setStatus] = useState<"idle" | "pending" | "saving" | "saved">(
    "idle",
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const latestSaveRef = useRef(value);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    if (status === "idle" || status === "saved") {
      setDisplay(value);
    }
  }, [value, status]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const runSave = useCallback((count: number) => {
    latestSaveRef.current = count;
    setStatus("saving");
    saveChainRef.current = saveChainRef.current
      .then(async () => {
        const target = latestSaveRef.current;
        await onSaveRef.current(target);
        if (latestSaveRef.current === target) {
          setStatus("saved");
          window.setTimeout(() => {
            setStatus((current) => (current === "saved" ? "idle" : current));
          }, 700);
        }
      })
      .catch(() => {
        setStatus("idle");
        setDisplay(value);
      });
  }, [value]);

  const scheduleSave = useCallback(
    (count: number) => {
      latestSaveRef.current = count;
      setStatus("pending");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        runSave(count);
      }, SAVE_DEBOUNCE_MS);
    },
    [runSave],
  );

  function adjust(delta: number) {
    if (disabled) return;
    setDisplay((prev) => {
      const next = Math.min(MAX_TROPHIES, Math.max(MIN_TROPHIES, prev + delta));
      if (next === prev) return prev;
      onChange(next);
      scheduleSave(next);
      return next;
    });
  }

  const atMin = display <= MIN_TROPHIES;
  const atMax = display >= MAX_TROPHIES;
  const isBusy = status === "pending" || status === "saving";

  return (
    <div
      id={id}
      role="group"
      aria-label={ariaLabel}
      aria-busy={isBusy}
      className={cn(
        "inline-flex items-stretch overflow-hidden rounded-md border bg-background shadow-sm transition-all duration-200",
        status === "pending" && "border-primary/40 ring-2 ring-primary/15",
        status === "saving" && "border-primary/50 ring-2 ring-primary/25",
        status === "saved" && "border-green-500/50 ring-2 ring-green-500/20",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="h-8 w-7 rounded-none border-r"
        disabled={disabled || atMin}
        aria-label="Decrease place trophies"
        onClick={() => adjust(-1)}
      >
        <ChevronDown className="size-3.5" />
      </Button>
      <div
        className={cn(
          "flex min-w-[2.25rem] items-center justify-center gap-1 px-1 text-sm font-medium tabular-nums",
          isBusy && "animate-pulse text-primary",
          status === "saved" && "text-green-700 dark:text-green-400",
        )}
      >
        <span>{display}</span>
        {status === "saving" ? (
          <Loader2 className="size-3 animate-spin text-primary" aria-hidden />
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="h-8 w-7 rounded-none border-l"
        disabled={disabled || atMax}
        aria-label="Increase place trophies"
        onClick={() => adjust(1)}
      >
        <ChevronUp className="size-3.5" />
      </Button>
    </div>
  );
}
