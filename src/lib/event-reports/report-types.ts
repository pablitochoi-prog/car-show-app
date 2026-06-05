export type EventReportGroupId =
  | "financial"
  | "registrations-vehicles"
  | "voting-awards"
  | "judging-operations"
  | "attendees-marketing"
  | "staffing-admin";

export type EventReportTypeId =
  | "home"
  | "financial"
  | "registrations"
  | "staffing"
  | "public-voting"
  | "judge-ballots"
  | "awards"
  | "judge-progress"
  | "scorecards"
  | "geography"
  | "check-in";

export type EventReportDefinition = {
  id: EventReportTypeId;
  label: string;
  description: string;
  groupId: EventReportGroupId;
  /** Shown on home + navigable when true */
  available: boolean;
  /** Home card visible but links to placeholder copy */
  comingSoon?: boolean;
  comingSoonNote?: string;
  supportsCsv?: boolean;
  supportsPrint?: boolean;
};

export const EVENT_REPORT_GROUPS: {
  id: EventReportGroupId;
  label: string;
}[] = [
  { id: "financial", label: "Financial" },
  { id: "registrations-vehicles", label: "Registrations & Vehicles" },
  { id: "voting-awards", label: "Voting & Awards" },
  { id: "judging-operations", label: "Judging Operations" },
  { id: "attendees-marketing", label: "Attendees & Marketing" },
  { id: "staffing-admin", label: "Staffing / Admin" },
];

export const EVENT_REPORT_TYPES: EventReportDefinition[] = [
  {
    id: "home",
    label: "All reports",
    description: "Choose a report for this event.",
    groupId: "financial",
    available: true,
  },
  {
    id: "financial",
    label: "Financial Summary",
    description:
      "Registration revenue, fees, and payment status for this event.",
    groupId: "financial",
    available: true,
    supportsCsv: false,
  },
  {
    id: "registrations",
    label: "Registration Detail",
    description:
      "Searchable list of registrations and vehicles with contact and payment fields.",
    groupId: "registrations-vehicles",
    available: true,
    supportsCsv: true,
    supportsPrint: true,
  },
  {
    id: "staffing",
    label: "Staffing List",
    description: "Event staff, roles, and judging assignments.",
    groupId: "staffing-admin",
    available: true,
    supportsCsv: true,
  },
  {
    id: "public-voting",
    label: "Public Voting Results",
    description: "Website and SMS vote rankings by public voting category.",
    groupId: "voting-awards",
    available: true,
    supportsCsv: true,
  },
  {
    id: "judge-ballots",
    label: "Judge Ballot Results",
    description: "Informal judge ballot rankings by award category.",
    groupId: "voting-awards",
    available: true,
    supportsCsv: true,
  },
  {
    id: "awards",
    label: "Awards / Winners",
    description:
      "Trophy placements and projected winners for announcements and printing.",
    groupId: "voting-awards",
    available: true,
    supportsCsv: true,
    supportsPrint: true,
  },
  {
    id: "judge-progress",
    label: "Judge Progress",
    description:
      "Score sheet and ballot completion status while judging is underway.",
    groupId: "judging-operations",
    available: true,
    supportsCsv: true,
  },
  {
    id: "scorecards",
    label: "Structured Scorecard Results",
    description:
      "High-level score sheet status by class. Open the full results workspace for detail.",
    groupId: "judging-operations",
    available: true,
    supportsCsv: false,
  },
  {
    id: "geography",
    label: "Attendee / Geographic Breakdown",
    description: "Where registrants and vehicles came from.",
    groupId: "attendees-marketing",
    available: false,
    comingSoon: true,
    comingSoonNote: "Geographic breakdown tables are planned for a later phase.",
  },
  {
    id: "check-in",
    label: "Check-In / No-Show",
    description: "Event-day attendance and dash card tracking.",
    groupId: "attendees-marketing",
    available: false,
    comingSoon: true,
    comingSoonNote:
      "Requires check-in tracking fields on registered vehicles. Planned for a later phase.",
  },
];

const REPORT_BY_ID = new Map(
  EVENT_REPORT_TYPES.map((r) => [r.id, r] as const),
);

export function getEventReportDefinition(
  id: EventReportTypeId,
): EventReportDefinition | undefined {
  return REPORT_BY_ID.get(id);
}

/** Maps legacy `voting` query param to `public-voting`. */
export function normalizeReportParam(
  raw: string | undefined,
): EventReportTypeId {
  const trimmed = raw?.trim();
  if (!trimmed) return "home";
  if (trimmed === "voting") return "public-voting";
  if (isEventReportTypeId(trimmed)) return trimmed;
  return "home";
}

export function isEventReportTypeId(value: string): value is EventReportTypeId {
  return REPORT_BY_ID.has(value as EventReportTypeId);
}

export function defaultEventReportType(): EventReportTypeId {
  return "home";
}

export function reportsForHomeCards(): EventReportDefinition[] {
  return EVENT_REPORT_TYPES.filter((r) => r.id !== "home");
}

export function navigableReportTypes(): EventReportDefinition[] {
  return EVENT_REPORT_TYPES.filter(
    (r) => r.id !== "home" && (r.available || r.comingSoon),
  );
}

export function reportsByGroup(groupId: EventReportGroupId): EventReportDefinition[] {
  return reportsForHomeCards().filter((r) => r.groupId === groupId);
}

export const CSV_EXPORT_REPORT_IDS = [
  "registrations",
  "staffing",
  "public-voting",
  "judge-ballots",
  "awards",
  "judge-progress",
] as const;

export type CsvExportReportId = (typeof CSV_EXPORT_REPORT_IDS)[number];

export function isCsvExportReportId(value: string): value is CsvExportReportId {
  return (CSV_EXPORT_REPORT_IDS as readonly string[]).includes(value);
}
