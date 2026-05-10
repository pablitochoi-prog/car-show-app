import type { EventStatus, RegistrationStatus } from "@prisma/client";
import { formatHhMmAs12hLabel } from "@/lib/time-12h";

export function formatEventWhen(d: Date) {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Calendar date + optional stored `HH:MM` start time for dashboard cards. */
export function formatEventDateAndStartTime(
  startDate: Date,
  startTime: string | null | undefined
) {
  const datePart = startDate.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const raw = startTime?.trim();
  if (!raw) return datePart;
  const clock = formatHhMmAs12hLabel(raw);
  return clock ? `${datePart} · ${clock}` : datePart;
}

export function formatStatusLabel(status: EventStatus | RegistrationStatus) {
  return String(status).replace(/_/g, " ");
}
