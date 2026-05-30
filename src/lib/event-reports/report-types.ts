export const EVENT_REPORT_TYPES = [
  {
    id: "voting",
    label: "Public votes",
    description: "Public and SMS vote counts by category and vehicle.",
    available: true,
  },
  {
    id: "judging",
    label: "Judging",
    description: "Judge scores and notes by vehicle.",
    available: false,
  },
  {
    id: "awards",
    label: "Awards",
    description: "Award winners and trophy assignments.",
    available: false,
  },
  {
    id: "attendees",
    label: "Attendees",
    description: "Registration and check-in summaries.",
    available: false,
  },
  {
    id: "staffing",
    label: "Staffing",
    description: "Event staff roles and assignments.",
    available: false,
  },
  {
    id: "financials",
    label: "Financials",
    description: "Registration fees, donations, and payouts.",
    available: false,
  },
] as const;

export type EventReportTypeId = (typeof EVENT_REPORT_TYPES)[number]["id"];

export function isEventReportTypeId(value: string): value is EventReportTypeId {
  return EVENT_REPORT_TYPES.some((r) => r.id === value);
}

export function defaultEventReportType(): EventReportTypeId {
  return "voting";
}
