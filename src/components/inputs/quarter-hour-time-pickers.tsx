"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  formatHhMmAs12hLabel,
  parseTypedTimeToHhMm,
} from "@/lib/time-12h";
import { normalizeTimeToFiveMinutes } from "@/lib/time-quarter-hour";
import { QuarterHourClockModal } from "@/components/inputs/quarter-hour-clock-modal";

type QuarterHourTimePickersProps = {
  idPrefix: string;
  label: string;
  /** Hide label visually but keep for screen readers (stacked schedule rows). */
  labelSrOnly?: boolean;
  /** Red asterisk next to label (e.g. create-event required fields). */
  showRequiredAsterisk?: boolean;
  /** Forward `required` to the text input (native constraint hint). */
  inputRequired?: boolean;
  /** Disable typing and clock picker (e.g. listing time when not editable). */
  disabled?: boolean;
  value: string;
  onChange: (hhMm: string) => void;
};

/** Placeholder hint for 12-hour typing (grey via Input placeholder styles). */
const TIME_INPUT_PLACEHOLDER = "12:00 PM";

/**
 * Type a time (12h or 24h) or use the clock button for the analog picker.
 * Stored value is 24-hour `HH:MM` or empty.
 */
export function QuarterHourTimePickers({
  idPrefix,
  label,
  labelSrOnly,
  showRequiredAsterisk,
  inputRequired,
  disabled = false,
  value,
  onChange,
}: QuarterHourTimePickersProps) {
  const [open, setOpen] = useState(false);
  /** Remounts the modal so draft state is re-derived from `value` each time it opens. */
  const [openNonce, setOpenNonce] = useState(0);

  const displayFromProp = value ? formatHhMmAs12hLabel(value) : "";
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-2">
      <Label
        htmlFor={`${idPrefix}-input`}
        className={labelSrOnly ? "sr-only" : undefined}
      >
        {label}
        {showRequiredAsterisk ? (
          <span className="text-destructive" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </Label>
      <div
        className={cn(
          "flex h-10 min-w-0 items-center gap-2 rounded-md border border-input bg-transparent px-2 py-1 shadow-xs outline-none sm:h-11",
          !disabled && "focus-within:ring-2 focus-within:ring-ring",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <Input
          id={`${idPrefix}-input`}
          type="text"
          autoComplete="off"
          required={inputRequired && !disabled}
          aria-required={inputRequired && !disabled ? true : undefined}
          disabled={disabled}
          placeholder={TIME_INPUT_PLACEHOLDER}
          className={cn(
            "h-9 min-w-0 flex-1 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0 sm:h-10",
            "placeholder:text-muted-foreground",
            !value && !focused && "text-muted-foreground",
            disabled && "cursor-not-allowed"
          )}
          value={focused ? text : displayFromProp}
          onFocus={() => {
            if (disabled) return;
            setFocused(true);
            setText(displayFromProp);
          }}
          onBlur={() => {
            setFocused(false);
            const parsed = parseTypedTimeToHhMm(text);
            if (parsed === null) {
              setText(displayFromProp);
              return;
            }
            onChange(normalizeTimeToFiveMinutes(parsed));
          }}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          id={`${idPrefix}-clock`}
          type="button"
          disabled={disabled}
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground sm:size-10",
            "outline-none transition-colors hover:bg-accent hover:text-foreground",
            "focus-visible:ring-2 focus-visible:ring-ring",
            disabled && "opacity-50"
          )}
          aria-label={`Open ${label} picker`}
          onMouseDown={(e) => {
            if (disabled) return;
            e.preventDefault();
          }}
          onClick={() => {
            if (disabled) return;
            setOpenNonce((n) => n + 1);
            setOpen(true);
          }}
        >
          <Clock className="size-5" aria-hidden />
        </button>
      </div>

      <QuarterHourClockModal
        key={openNonce}
        open={open}
        onOpenChange={setOpen}
        title={label}
        value={value}
        onChange={(next) => onChange(normalizeTimeToFiveMinutes(next))}
      />
    </div>
  );
}
