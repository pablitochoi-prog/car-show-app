"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FIVE_MINUTE_OPTIONS,
  normalizeTimeToFiveMinutes,
  parseFiveMinuteParts,
} from "@/lib/time-quarter-hour";
import { type AmPm, from24Hour, to24Hour } from "@/lib/time-12h";

type PickerStep = "hour" | "minute";

/** Clock positions 12 → 1 … 11 clockwise from the top. */
const HOUR_DISPLAY_ORDER = [
  12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
] as const;

/** Twelve stops: 00, 05, …, 55 clockwise from the top (same geometry as the hour ring). */
const MINUTE_MARKERS: { min: string; angle: number }[] =
  FIVE_MINUTE_OPTIONS.map((min, i) => ({
    min,
    angle: -Math.PI / 2 + i * (Math.PI / 6),
  }));

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function initialDraft(value: string): {
  step: PickerStep;
  draftH12: number;
  draftAmpm: AmPm;
  draftMin: string;
} {
  const parts = parseFiveMinuteParts(value);
  if (!parts.hour) {
    return {
      step: "hour",
      draftH12: 12,
      draftAmpm: "PM",
      draftMin: "00",
    };
  }
  const h24 = parseInt(parts.hour, 10);
  const { h12, ampm } = from24Hour(Number.isNaN(h24) ? 12 : h24);
  return {
    step: "hour",
    draftH12: h12,
    draftAmpm: ampm,
    draftMin: parts.minute || "00",
  };
}

type QuarterHourClockModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Screen reader title (field label). */
  title: string;
  value: string;
  onChange: (hhMm: string) => void;
};

/**
 * Material-style modal: digital header + analog clock for hours (1–12),
 * then a clock with twelve stops for minutes in **five-minute** steps (00–55).
 */
export function QuarterHourClockModal({
  open,
  onOpenChange,
  title,
  value,
  onChange,
}: QuarterHourClockModalProps) {
  const init = initialDraft(value);
  const [step, setStep] = useState<PickerStep>(init.step);
  const [draftH12, setDraftH12] = useState(init.draftH12);
  const [draftAmpm, setDraftAmpm] = useState<AmPm>(init.draftAmpm);
  const [draftMin, setDraftMin] = useState(init.draftMin);

  function commit() {
    const h24 = to24Hour(draftH12, draftAmpm);
    const mm = draftMin;
    const raw = `${pad2(h24)}:${mm}`;
    onChange(normalizeTimeToFiveMinutes(raw));
    onOpenChange(false);
  }

  function clearAndClose() {
    onChange("");
    onOpenChange(false);
  }

  const hourHandAngle =
    -Math.PI / 2 +
    (draftH12 === 12 ? 0 : draftH12) * (Math.PI / 6);

  const minuteIdx = FIVE_MINUTE_OPTIONS.indexOf(draftMin);
  const minuteHandAngle =
    minuteIdx >= 0 ? MINUTE_MARKERS[minuteIdx]!.angle : -Math.PI / 2;

  const handAngle = step === "hour" ? hourHandAngle : minuteHandAngle;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal>
      <Dialog.Portal>
        <Dialog.Backdrop
          className="fixed inset-0 z-50 bg-black/40 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs"
        />
        <Dialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[min(100vw-1.5rem,340px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-popover text-popover-foreground shadow-xl outline-none",
            "transition duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0"
          )}
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>

          <div className="border-b px-4 pt-5 pb-3">
            <div className="flex items-start justify-center gap-2 tabular-nums">
              <div className="flex items-baseline gap-0.5 text-4xl font-light tracking-tight">
                <button
                  type="button"
                  className={cn(
                    "rounded px-1 transition-colors",
                    step === "hour"
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setStep("hour")}
                >
                  {draftH12}
                </button>
                <span className="text-muted-foreground">:</span>
                <button
                  type="button"
                  className={cn(
                    "min-w-[2.5ch] rounded px-1 transition-colors",
                    step === "minute"
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setStep("minute")}
                >
                  {draftMin}
                </button>
              </div>
              <div className="ml-2 flex flex-col gap-0.5 text-lg leading-tight font-medium">
                <button
                  type="button"
                  className={cn(
                    "rounded px-2 py-0.5 text-left transition-colors",
                    draftAmpm === "AM"
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setDraftAmpm("AM")}
                >
                  AM
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded px-2 py-0.5 text-left transition-colors",
                    draftAmpm === "PM"
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setDraftAmpm("PM")}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 pt-4 pb-2">
            <div className="relative mx-auto aspect-square w-full max-w-[260px]">
              <div className="absolute inset-0 rounded-full bg-muted" />

              <svg
                className="pointer-events-none absolute inset-0 text-primary"
                viewBox="0 0 100 100"
                aria-hidden
              >
                <line
                  x1="50"
                  y1="50"
                  x2={50 + 32 * Math.cos(handAngle)}
                  y2={50 + 32 * Math.sin(handAngle)}
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                />
                <circle cx="50" cy="50" r="3.25" fill="currentColor" />
              </svg>

              {step === "hour" ? (
                <>
                  {HOUR_DISPLAY_ORDER.map((label, i) => {
                    const angle = -Math.PI / 2 + i * (Math.PI / 6);
                    const rPct = 38;
                    const left = 50 + rPct * Math.cos(angle);
                    const top = 50 + rPct * Math.sin(angle);
                    const selected = draftH12 === label;
                    return (
                      <button
                        key={label}
                        type="button"
                        className={cn(
                          "absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-lg font-medium transition-colors",
                          selected
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-background/90 text-foreground hover:bg-accent"
                        )}
                        style={{
                          left: `${left}%`,
                          top: `${top}%`,
                        }}
                        onClick={() => {
                          setDraftH12(label);
                          setStep("minute");
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </>
              ) : (
                <>
                  {MINUTE_MARKERS.map(({ min, angle }) => {
                    const rPct = 38;
                    const left = 50 + rPct * Math.cos(angle);
                    const top = 50 + rPct * Math.sin(angle);
                    const selected = draftMin === min;
                    return (
                      <button
                        key={min}
                        type="button"
                        className={cn(
                          "absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors sm:h-10 sm:w-10 sm:text-sm",
                          selected
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-background/90 text-foreground hover:bg-accent"
                        )}
                        style={{
                          left: `${left}%`,
                          top: `${top}%`,
                        }}
                        onClick={() => setDraftMin(min)}
                      >
                        {min}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {step === "hour"
                ? "Choose hour, then pick minutes (5-minute steps)."
                : "Five-minute steps — tap a value."}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t px-3 py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mr-auto text-muted-foreground"
              onClick={clearAndClose}
            >
              Clear
            </Button>
            <Dialog.Close
              render={
                <Button type="button" variant="ghost" size="sm">
                  Cancel
                </Button>
              }
            />
            <Button type="button" size="sm" onClick={commit}>
              OK
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
