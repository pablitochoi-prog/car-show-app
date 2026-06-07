"use client";

import { useEffect, useId, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type AmPm,
  from24Hour,
  to24Hour,
} from "@/lib/time-12h";
import {
  FIVE_MINUTE_OPTIONS,
  normalizeDatetimeLocalToFiveMinutes,
  normalizeTimeToFiveMinutes,
  TIME_FIVE_MINUTE_STEP_SECONDS,
} from "@/lib/time-quarter-hour";

const HOUR_OPTIONS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

const nativeInputClassName =
  "h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30 [color-scheme:light] dark:[color-scheme:dark]";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isSafariBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|FxiOS/i.test(ua);
}

export function splitDatetimeLocal(local: string): { date: string; time: string } {
  const normalized = normalizeDatetimeLocalToFiveMinutes(local.trim());
  if (!normalized) return { date: "", time: "" };
  const idx = normalized.indexOf("T");
  if (idx === -1) return { date: normalized, time: "" };
  return {
    date: normalized.slice(0, idx),
    time: normalized.slice(idx + 1, idx + 6),
  };
}

function parseDatetimeParts(local: string): {
  date: string;
  h12: number;
  minute: string;
  ampm: AmPm;
} {
  const { date, time } = splitDatetimeLocal(local);
  if (!time) {
    return { date, h12: 12, minute: "00", ampm: "AM" };
  }
  const h24 = parseInt(time.slice(0, 2), 10);
  const minute = time.slice(3, 5) || "00";
  const { h12, ampm } = from24Hour(Number.isNaN(h24) ? 0 : h24);
  return { date, h12, minute, ampm };
}

function buildDatetimeLocal(
  date: string,
  h12: number,
  minute: string,
  ampm: AmPm,
): string {
  if (!date.trim()) return "";
  const h24 = to24Hour(h12, ampm);
  return normalizeDatetimeLocalToFiveMinutes(
    `${date}T${pad2(h24)}:${normalizeTimeToFiveMinutes(minute)}`,
  );
}

function formatDatetimeLocalDisplay(local: string): string {
  const { date, time } = splitDatetimeLocal(local);
  if (!date) return "";
  const [y, m, d] = date.split("-").map((n) => parseInt(n, 10));
  if (!time) {
    return Number.isNaN(y) ? date : `${pad2(m)}/${pad2(d)}/${y}`;
  }
  const label = normalizeTimeToFiveMinutes(time);
  const h24 = parseInt(label.slice(0, 2), 10);
  const { h12, ampm } = from24Hour(Number.isNaN(h24) ? 0 : h24);
  const mins = label.slice(3, 5);
  const dateLabel = Number.isNaN(y)
    ? date
    : `${pad2(m)}/${pad2(d)}/${y}`;
  return `${dateLabel}, ${h12}:${mins} ${ampm}`;
}

function todayLocalDatetime(): string {
  const now = new Date();
  const date = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const time = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  return normalizeDatetimeLocalToFiveMinutes(`${date}T${time}`);
}

function PickerColumn<T extends string | number>({
  options,
  value,
  onSelect,
  format,
}: {
  options: readonly T[];
  value: T;
  onSelect: (next: T) => void;
  format?: (opt: T) => string;
}) {
  return (
    <div className="flex max-h-48 w-11 flex-col overflow-y-auto rounded-md border bg-background">
      {options.map((opt) => {
        const selected = opt === value;
        return (
          <button
            key={String(opt)}
            type="button"
            className={cn(
              "px-2 py-1.5 text-sm tabular-nums transition-colors",
              selected
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
            onClick={() => onSelect(opt)}
          >
            {format ? format(opt) : String(opt)}
          </button>
        );
      })}
    </div>
  );
}

function DatetimePickerDialog({
  open,
  onOpenChange,
  title,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [date, setDate] = useState("");
  const [h12, setH12] = useState(12);
  const [minute, setMinute] = useState("00");
  const [ampm, setAmpm] = useState<AmPm>("AM");

  useEffect(() => {
    if (!open) return;
    const parts = parseDatetimeParts(value);
    setDate(parts.date);
    setH12(parts.h12);
    setMinute(normalizeTimeToFiveMinutes(parts.minute));
    setAmpm(parts.ampm);
  }, [open, value]);

  function apply(next: string) {
    onChange(normalizeDatetimeLocalToFiveMinutes(next));
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(100vw-2rem,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-4 shadow-lg">
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <div className="space-y-4">
            <input
              type="date"
              aria-label={`${title} date`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={nativeInputClassName}
            />
            <div className="flex justify-center gap-1">
              <PickerColumn
                options={HOUR_OPTIONS}
                value={h12}
                onSelect={setH12}
                format={(h) => pad2(h)}
              />
              <PickerColumn
                options={FIVE_MINUTE_OPTIONS}
                value={minute}
                onSelect={setMinute}
              />
              <PickerColumn
                options={["AM", "PM"] as const}
                value={ampm}
                onSelect={setAmpm}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => apply("")}
              >
                Clear
              </button>
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => apply(todayLocalDatetime())}
              >
                Today
              </button>
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={!date}
              onClick={() => apply(buildDatetimeLocal(date, h12, minute, ampm))}
            >
              Done
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SafariDatetimeLocalField({
  id,
  value,
  onChange,
  className,
  "aria-label": ariaLabel,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const display = formatDatetimeLocalDisplay(value);

  return (
    <>
      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        className={cn(
          nativeInputClassName,
          "flex items-center justify-between gap-2 text-left",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <span className={cn(!display && "text-muted-foreground")}>
          {display || "Select date and time"}
        </span>
        <Calendar className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      <DatetimePickerDialog
        open={open}
        onOpenChange={setOpen}
        title={ariaLabel ?? "Date and time"}
        value={value}
        onChange={onChange}
      />
    </>
  );
}

function NativeDatetimeLocalField({
  id,
  value,
  onChange,
  className,
  "aria-label": ariaLabel,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  className?: string;
  "aria-label"?: string;
}) {
  const normalized = normalizeDatetimeLocalToFiveMinutes(value);

  return (
    <input
      id={id}
      type="datetime-local"
      aria-label={ariaLabel}
      step={TIME_FIVE_MINUTE_STEP_SECONDS}
      value={normalized}
      className={cn(nativeInputClassName, className)}
      onChange={(e) =>
        onChange(normalizeDatetimeLocalToFiveMinutes(e.target.value))
      }
    />
  );
}

/** Combined date/time field — native picker on Chrome/Edge; column picker on Safari. */
export function DatetimeLocalField({
  id: idProp,
  value,
  onChange,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  className?: string;
  "aria-label"?: string;
}) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const useSafariPicker = isSafariBrowser();
  const normalizedValue = normalizeDatetimeLocalToFiveMinutes(value);

  if (useSafariPicker) {
    return (
      <SafariDatetimeLocalField
        id={id}
        value={normalizedValue}
        onChange={onChange}
        className={className}
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <NativeDatetimeLocalField
      id={id}
      value={normalizedValue}
      onChange={onChange}
      className={className}
      aria-label={ariaLabel}
    />
  );
}

export function zonedLocalToDatetimeLocal(date: string, time: string): string {
  if (!date?.trim() || !time?.trim()) return "";
  return `${date}T${normalizeTimeToFiveMinutes(time)}`;
}
