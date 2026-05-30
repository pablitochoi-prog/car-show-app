"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuarterHourTimePickers } from "@/components/inputs/quarter-hour-time-pickers";
import {
  eventTimeZoneLabel,
  type EventTimeZoneIana,
} from "@/lib/event-time-zones";

type Props = {
  idPrefix: string;
  label: string;
  date: string;
  time: string;
  timeZone: EventTimeZoneIana;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  dateMin?: string;
};

export function ZonedDateTimeFields({
  idPrefix,
  label,
  date,
  time,
  timeZone,
  onDateChange,
  onTimeChange,
  dateMin,
}: Props) {
  const tzLabel = eventTimeZoneLabel(timeZone) ?? timeZone;

  return (
    <div className="grid min-w-[28rem] grid-cols-[minmax(9.45rem,1.05fr)_minmax(0,1fr)_minmax(5.5rem,auto)] items-end gap-2">
      <div className="min-w-0 space-y-2">
        <Label htmlFor={`${idPrefix}-date`}>{label} — date</Label>
        <Input
          id={`${idPrefix}-date`}
          type="date"
          autoComplete="off"
          min={dateMin}
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="min-w-0 font-mono text-sm tabular-nums"
        />
      </div>
      <QuarterHourTimePickers
        idPrefix={`${idPrefix}-time`}
        label={`${label} — time`}
        value={time}
        onChange={onTimeChange}
      />
      <div className="min-w-0 space-y-2">
        <Label className="text-muted-foreground">Time zone</Label>
        <p
          className="flex h-10 items-center text-sm font-medium sm:h-11"
          aria-label={`Time zone ${tzLabel}`}
        >
          {tzLabel}
        </p>
      </div>
    </div>
  );
}
