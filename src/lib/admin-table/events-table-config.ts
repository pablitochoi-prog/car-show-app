import type { Prisma } from "@prisma/client";
import type { AdminTableConfig, ParsedAdminTableParams } from "./types";

export const EVENT_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "ACTIVE",
  "VOTING",
  "CLOSED",
  "ARCHIVED",
] as const;

export const eventsAdminTableConfig: AdminTableConfig = {
  prefix: "events",
  defaultSort: "startDate",
  defaultSortDir: "desc",
  defaultPageSize: 25,
  maxPageSize: 100,
  columns: [
    { id: "name", sortable: true, filterable: true, filterType: "text" },
    { id: "state", sortable: true, filterable: true, filterType: "text" },
    { id: "startDate", sortable: true, filterable: false, filterType: "dateFrom" },
    { id: "startDateFrom", filterable: true, filterType: "dateFrom" },
    { id: "startDateTo", filterable: true, filterType: "dateTo" },
    { id: "orgName", sortable: true, filterable: true, filterType: "text" },
    { id: "organizer", sortable: false, filterable: true, filterType: "text" },
    {
      id: "status",
      sortable: true,
      filterable: true,
      filterType: "enum",
      enumValues: EVENT_STATUSES,
    },
  ],
};

function utcDateFromYmd(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1, 12, 0, 0));
}

export function buildEventsAdminWhere(
  params: ParsedAdminTableParams,
): Prisma.EventWhereInput {
  const and: Prisma.EventWhereInput[] = [];

  if (params.q) {
    const or: Prisma.EventWhereInput[] = [
      { name: { contains: params.q, mode: "insensitive" } },
    ];
    const num = Number(params.q);
    if (Number.isFinite(num)) or.push({ showNumber: num });
    and.push({ OR: or });
  }

  if (params.filters.name) {
    and.push({ name: { contains: params.filters.name, mode: "insensitive" } });
  }

  if (params.filters.state) {
    const term = params.filters.state.trim();
    and.push({
      state: { contains: term, mode: "insensitive" },
    });
  }

  const from = utcDateFromYmd(params.filters.startDateFrom ?? "");
  const to = utcDateFromYmd(params.filters.startDateTo ?? "");
  if (from) and.push({ startDate: { gte: from } });
  if (to) and.push({ startDate: { lte: to } });

  if (params.filters.orgName) {
    and.push({
      organization: {
        name: { contains: params.filters.orgName, mode: "insensitive" },
      },
    });
  }

  if (params.filters.organizer) {
    const term = params.filters.organizer;
    and.push({
      staffMembers: {
        some: {
          roleLinks: { some: { role: { slug: "organizer" } } },
          user: {
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { firstName: { contains: term, mode: "insensitive" } },
              { lastName: { contains: term, mode: "insensitive" } },
              { email: { contains: term, mode: "insensitive" } },
            ],
          },
        },
      },
    });
  }

  if (params.filters.status && EVENT_STATUSES.includes(params.filters.status as (typeof EVENT_STATUSES)[number])) {
    and.push({ status: params.filters.status as (typeof EVENT_STATUSES)[number] });
  }

  return and.length ? { AND: and } : {};
}

export function buildEventsAdminOrderBy(
  params: ParsedAdminTableParams,
): Prisma.EventOrderByWithRelationInput | Prisma.EventOrderByWithRelationInput[] {
  const dir = params.sortDir;
  switch (params.sort) {
    case "name":
      return { name: dir };
    case "state":
      return { state: dir };
    case "startDate":
      return { startDate: dir };
    case "orgName":
      return { organization: { name: dir } };
    case "status":
      return { status: dir };
    default:
      return { startDate: "desc" };
  }
}
