import type { DashCardEventModel } from "@/lib/dash-card-types";
import { formatHhMmAs12hLabel } from "@/lib/time-12h";

type EventForDashCard = {
  name: string;
  startDate: Date;
  endDate: Date | null;
  startTime: string | null;
  endTime: string | null;
  venue: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  logoUrl: string | null;
  organization: { name: string; logo: string | null } | null;
};

function formatDateRangeLabel(startDate: Date, endDate: Date | null): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  };
  const start = startDate.toLocaleDateString("en-US", opts);
  if (!endDate) return start;
  if (startDate.toDateString() === endDate.toDateString()) return start;
  const end = endDate.toLocaleDateString("en-US", opts);
  return `${start} – ${end}`;
}

function formatTimeLabel(
  startTime: string | null,
  endTime: string | null,
): string | null {
  const start = formatHhMmAs12hLabel(startTime?.trim() ?? "");
  const end = formatHhMmAs12hLabel(endTime?.trim() ?? "");
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  if (end) return `Until ${end}`;
  return null;
}

function formatVenueLine(event: Pick<
  EventForDashCard,
  "venue" | "street" | "city" | "state"
>): string {
  const venue = event.venue?.trim();
  if (venue) return venue;
  const cityState = [event.city, event.state].filter(Boolean).join(", ");
  const parts = [event.street?.trim(), cityState || null].filter(Boolean);
  return parts.join(" · ") || "Venue to be announced";
}

/** Maps Prisma event + org fields to printable dash card header data. */
export function buildDashCardEventModel(event: EventForDashCard): DashCardEventModel {
  const logoUrl = event.logoUrl?.trim() || event.organization?.logo?.trim() || null;
  const hostOrganizationName = event.organization?.name?.trim() || null;

  return {
    showName: event.name,
    hostOrganizationName,
    dateRangeLabel: formatDateRangeLabel(event.startDate, event.endDate),
    timeLabel: formatTimeLabel(event.startTime, event.endTime),
    venue: formatVenueLine(event),
    logoUrl,
  };
}
