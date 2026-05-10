"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { QuarterHourTimePickers } from "@/components/inputs/quarter-hour-time-pickers";
import {
  CAR_CLUB_INPUT_CLASS as inputClass,
  type CarClubFormValues,
} from "./car-club-form-values";

export function CarClubMeetingFrequencyTime({
  v,
  patch,
}: {
  v: CarClubFormValues;
  patch: (p: Partial<CarClubFormValues>) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] sm:items-end">
      <div className="min-w-0 space-y-2">
        <Label htmlFor="meetingFrequency">Meeting frequency</Label>
        <Input
          id="meetingFrequency"
          className={inputClass}
          value={v.meetingFrequency}
          onChange={(e) => patch({ meetingFrequency: e.target.value })}
          placeholder="e.g. First Tuesday monthly"
        />
      </div>
      <div className="min-w-0">
        <QuarterHourTimePickers
          idPrefix="club-meeting-time"
          label="Meeting time"
          value={v.meetingTime}
          onChange={(hhMm) => patch({ meetingTime: hhMm })}
        />
      </div>
    </div>
  );
}
