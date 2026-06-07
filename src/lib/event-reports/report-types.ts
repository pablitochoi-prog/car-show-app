export type EventReportGroupId =
  | "financial"
  | "registrations-vehicles"
  | "voting-awards"
  | "judging-operations"
  | "attendees-marketing"
  | "staffing-admin"
  | "awards-results";

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
  /** Lifecycle order for nav tabs and home cards (lower = earlier). */
  navSortOrder: number;
  /** Shown on home + navigable when true */
  available: boolean;
  /** Home card visible but links to placeholder copy */
  comingSoon?: boolean;
  comingSoonNote?: string;
  supportsCsv?: boolean;
  supportsPrint?: boolean;
};

/** Event lifecycle order for home section headings. */
export const EVENT_REPORT_GROUPS: {
  id: EventReportGroupId;
  label: string;
}[] = [
  { id: "financial", label: "Financial" },
  { id: "registrations-vehicles", label: "Registrations & Vehicles" },
  { id: "staffing-admin", label: "Staffing / Admin" },
  { id: "attendees-marketing", label: "Attendees & Marketing" },
  { id: "voting-awards", label: "Voting" },
  { id: "judging-operations", label: "Judging Operations" },
  { id: "awards-results", label: "Awards & Trophies" },
];

export const EVENT_REPORT_TYPES: EventReportDefinition[] = [
  {
    id: "home",
    label: "All reports",
    description: "Choose a report for this event.",
    groupId: "financial",
    navSortOrder: 0,
    available: true,
  },
  {
    id: "financial",
    label: "Financial Summary",
    description:
      "Registration revenue, fees, and payment status for this event.",
    groupId: "financial",
    navSortOrder: 10,
    available: true,
    supportsCsv: false,
  },
  {
    id: "registrations",
    label: "Registration Detail",
    description:
      "Searchable list of registrations and vehicles with contact and payment fields.",
    groupId: "registrations-vehicles",
    navSortOrder: 20,
    available: true,
    supportsCsv: true,
    supportsPrint: true,
  },
  {
    id: "staffing",
    label: "Staffing List",
    description: "Event staff, roles, and judging assignments.",
    groupId: "staffing-admin",
    navSortOrder: 30,
    available: true,
    supportsCsv: true,
  },
  {
    id: "check-in",
    label: "Check-In / No-Show",
    description: "Event-day attendance and dash card tracking.",
    groupId: "attendees-marketing",
    navSortOrder: 40,
    available: false,
    comingSoon: true,
    comingSoonNote:
      "Requires check-in tracking fields on registered vehicles. Planned for a later phase.",
  },
  {
    id: "geography",
    label: "Attendee / Geographic Breakdown",
    description: "Where registrants and vehicles came from.",
    groupId: "attendees-marketing",
    navSortOrder: 50,
    available: false,
    comingSoon: true,
    comingSoonNote: "Geographic breakdown tables are planned for a later phase.",
  },
  {
    id: "judge-progress",
    label: "Judge Progress",
    description:
      "Score sheet and ballot completion status while judging is underway.",
    groupId: "judging-operations",
    navSortOrder: 60,
    available: true,
    supportsCsv: true,
  },
  {
    id: "public-voting",
    label: "Public Voting Results",
    description: "Website and SMS vote rankings by public voting category.",
    groupId: "voting-awards",
    navSortOrder: 70,
    available: true,
    supportsCsv: true,
  },
  {
    id: "judge-ballots",
    label: "Judge Ballot Results",
    description: "Informal judge ballot rankings by award category.",
    groupId: "voting-awards",
    navSortOrder: 80,
    available: true,
    supportsCsv: true,
  },
  {
    id: "scorecards",
    label: "Judged Scorecard Results",
    description:
      "High-level score sheet status by class. Open the full results workspace for detail.",
    groupId: "judging-operations",
    navSortOrder: 90,
    available: true,
    supportsCsv: false,
  },
  {
    id: "awards",
    label: "Awards / Winners",
    description:
      "Trophy placements and projected winners for announcements and printing.",
    groupId: "awards-results",
    navSortOrder: 100,
    available: true,
    supportsCsv: true,
    supportsPrint: true,
  },
];

/** Expected nav tab order (excludes home). */
export const EVENT_REPORT_NAV_ORDER: EventReportTypeId[] = [
  "financial",
  "registrations",
  "staffing",
  "check-in",
  "geography",
  "judge-progress",
  "public-voting",
  "judge-ballots",
  "scorecards",
  "awards",
];

export const REPORT_EMPTY_MESSAGES = {
  publicVotingNoCategories:
    "No public voting categories are configured for this event yet. Set them up under Edit Event → SMS Voting.",
  publicVotingNoVotes:
    "No public voting results yet. This report only includes attendee/public votes from website and SMS voting — not score sheet or trophy winner results.",
  judgeBallotNoCategories:
    "No judge ballot categories are configured for this event yet. Create award categories under Awards & Judging → Judge Ballot.",
  judgeBallotNoVotes:
    "No judge ballot votes have been submitted yet. This report only includes informal judge ballot voting — not structured score sheet winners or trophy placements.",
  judgeBallotWinnersWithoutVoteDetail:
    "No judge ballot vote totals are available to display. Awards / Winners may still list trophy placements sourced from judge ballot (manual overrides, projected picks, or finalized results after vote detail was removed). See the Awards / Winners report for placements.",
} as const;

const REPORT_BY_ID = new Map(
  EVENT_REPORT_TYPES.map((r) => [r.id, r] as const),
);

function sortByNavOrder(
  reports: EventReportDefinition[],
): EventReportDefinition[] {
  return [...reports].sort((a, b) => a.navSortOrder - b.navSortOrder);
}

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
  return sortByNavOrder(
    EVENT_REPORT_TYPES.filter((r) => r.id !== "home"),
  );
}

export function navigableReportTypes(): EventReportDefinition[] {
  return sortByNavOrder(
    EVENT_REPORT_TYPES.filter(
      (r) => r.id !== "home" && (r.available || r.comingSoon),
    ),
  );
}

export type EventReportVotingSetup = {
  publicVotingConfigured: boolean;
  judgeBallotConfigured: boolean;
  scoreSheetConfigured: boolean;
};

/** Voting-results reports only appear when that method is configured on the event. */
export function isVotingResultsReportVisible(
  reportId: EventReportTypeId,
  setup: EventReportVotingSetup,
): boolean {
  switch (reportId) {
    case "public-voting":
      return setup.publicVotingConfigured;
    case "judge-ballots":
      return setup.judgeBallotConfigured;
    case "scorecards":
      return setup.scoreSheetConfigured;
    default:
      return true;
  }
}

export function filterReportsForEvent(
  reports: EventReportDefinition[],
  setup: EventReportVotingSetup,
): EventReportDefinition[] {
  return reports.filter((r) => isVotingResultsReportVisible(r.id, setup));
}

export function navigableReportTypesForEvent(
  setup: EventReportVotingSetup,
): EventReportDefinition[] {
  return filterReportsForEvent(navigableReportTypes(), setup);
}

export function reportsForHomeCardsForEvent(
  setup: EventReportVotingSetup,
): EventReportDefinition[] {
  return filterReportsForEvent(reportsForHomeCards(), setup);
}

export function reportsByGroup(groupId: EventReportGroupId): EventReportDefinition[] {
  return sortByNavOrder(
    reportsForHomeCards().filter((r) => r.groupId === groupId),
  );
}

/** True when a ranked report has at least one row in any section/category. */
export function reportHasRankedRows(
  sections: ReadonlyArray<{ rows: ReadonlyArray<unknown> }>,
): boolean {
  return sections.some((section) => section.rows.length > 0);
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

/** CSV download path for reports that support export (matches API route). */
export function buildReportCsvHref(
  eventId: string,
  reportId: CsvExportReportId,
): string {
  return `/api/events/${eventId}/reports/${reportId}/csv`;
}

/** True when UI should show the Export CSV toolbar action. */
export function reportSupportsCsvExport(
  report: Pick<EventReportDefinition, "id" | "supportsCsv">,
): report is EventReportDefinition & { id: CsvExportReportId } {
  return !!report.supportsCsv && isCsvExportReportId(report.id);
}

export type ReportsHomeSummary = {
  total: number;
  available: number;
  comingSoon: number;
  withCsv: number;
  withPrint: number;
};

export function getReportsHomeSummary(
  cards: EventReportDefinition[] = reportsForHomeCards(),
): ReportsHomeSummary {
  return {
    total: cards.length,
    available: cards.filter((r) => r.available && !r.comingSoon).length,
    comingSoon: cards.filter((r) => r.comingSoon).length,
    withCsv: cards.filter((r) => r.supportsCsv).length,
    withPrint: cards.filter((r) => r.supportsPrint).length,
  };
}
