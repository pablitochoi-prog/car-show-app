import type { Prisma } from "@prisma/client";

export const ORGANIZER_REGISTRATIONS_DEFAULT_PAGE_SIZE = 50;
export const ORGANIZER_REGISTRATIONS_MAX_PAGE_SIZE = 100;

export const ORGANIZER_REGISTRATION_STATUS_FILTER_LABELS = [
  "Cancelled",
  "Confirmed / Paid",
  "Pending",
  "Registration submitted",
] as const;

export type OrganizerRegistrationsSortKey =
  | "status"
  | "name"
  | "email"
  | "tier"
  | "cars"
  | "fee"
  | "collected"
  | "due";

export type OrganizerRegistrationsSortDir = "asc" | "desc";

export type OrganizerRegistrationsListParams = {
  page: number;
  pageSize: number;
  sort: OrganizerRegistrationsSortKey;
  sortDir: OrganizerRegistrationsSortDir;
  statusFilter: string[] | null;
  tierFilter: string[] | null;
};

function parsePositiveInt(
  raw: string | string[] | undefined,
  fallback: number,
): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function parseCsvParam(raw: string | string[] | undefined): string[] | null {
  const value = Array.isArray(raw) ? raw.join(",") : raw;
  if (!value?.trim()) return null;
  const items = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

const VALID_SORT_KEYS = new Set<OrganizerRegistrationsSortKey>([
  "status",
  "name",
  "email",
  "tier",
  "cars",
  "fee",
  "collected",
  "due",
]);

export function parseOrganizerRegistrationsSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): OrganizerRegistrationsListParams {
  const pageSizeRaw = parsePositiveInt(
    searchParams.pageSize,
    ORGANIZER_REGISTRATIONS_DEFAULT_PAGE_SIZE,
  );
  const pageSize = Math.min(
    pageSizeRaw,
    ORGANIZER_REGISTRATIONS_MAX_PAGE_SIZE,
  );

  const sortRaw = Array.isArray(searchParams.sort)
    ? searchParams.sort[0]
    : searchParams.sort;
  const sort = VALID_SORT_KEYS.has(sortRaw as OrganizerRegistrationsSortKey)
    ? (sortRaw as OrganizerRegistrationsSortKey)
    : "name";

  const sortDirRaw = Array.isArray(searchParams.sortDir)
    ? searchParams.sortDir[0]
    : searchParams.sortDir;
  const sortDir: OrganizerRegistrationsSortDir =
    sortDirRaw === "desc" ? "desc" : "asc";

  const statusFilter = parseCsvParam(searchParams.status);
  const tierFilter = parseCsvParam(searchParams.tier);

  return {
    page: parsePositiveInt(searchParams.page, 1),
    pageSize,
    sort,
    sortDir,
    statusFilter,
    tierFilter,
  };
}

function statusLabelWhere(label: string): Prisma.RegistrationWhereInput | null {
  switch (label) {
    case "Cancelled":
      return { status: "CANCELLED" };
    case "Confirmed / Paid":
      return {
        status: { not: "CANCELLED" },
        OR: [
          { paymentStatus: "PAID" },
          { status: "CONFIRMED", paymentStatus: { not: "PENDING" } },
        ],
      };
    case "Registration submitted":
      return {
        status: "PENDING",
        OR: [
          { paymentStatus: null },
          { paymentStatus: { notIn: ["PAID", "PENDING", "FAILED"] } },
        ],
      };
    case "Pending":
      return {
        status: { not: "CANCELLED" },
        OR: [{ paymentStatus: "PENDING" }, { paymentStatus: "FAILED" }],
      };
    default:
      return null;
  }
}

export function buildOrganizerRegistrationsWhere(
  eventId: string,
  params: Pick<
    OrganizerRegistrationsListParams,
    "statusFilter" | "tierFilter"
  >,
): Prisma.RegistrationWhereInput {
  const and: Prisma.RegistrationWhereInput[] = [{ eventId }];

  if (params.tierFilter?.length) {
    and.push({ tier: { name: { in: params.tierFilter } } });
  }

  if (params.statusFilter?.length) {
    const statusClauses = params.statusFilter
      .map(statusLabelWhere)
      .filter(
        (clause): clause is Prisma.RegistrationWhereInput => clause != null,
      );
    if (statusClauses.length > 0) {
      and.push({ OR: statusClauses });
    }
  }

  return and.length === 1 ? and[0]! : { AND: and };
}

export function buildOrganizerRegistrationsOrderBy(
  params: Pick<OrganizerRegistrationsListParams, "sort" | "sortDir">,
): Prisma.RegistrationOrderByWithRelationInput[] {
  const dir = params.sortDir;
  switch (params.sort) {
    case "status":
      return [{ status: dir }, { createdAt: "asc" }];
    case "email":
      return [
        { guestEmail: dir },
        { registrantEmail: dir },
        { user: { email: dir } },
        { createdAt: "asc" },
      ];
    case "tier":
      return [{ tier: { name: dir } }, { createdAt: "asc" }];
    case "cars":
      return [{ vehicles: { _count: dir } }, { createdAt: "asc" }];
    case "fee":
    case "collected":
    case "due":
      return [{ createdAt: dir }];
    case "name":
    default:
      return [
        { guestLastName: dir },
        { guestFirstName: dir },
        { registrantLastName: dir },
        { registrantFirstName: dir },
        { createdAt: "asc" },
      ];
  }
}

export function clampOrganizerRegistrationsPage(
  page: number,
  totalCount: number,
  pageSize: number,
): number {
  if (totalCount <= 0) return 1;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  return Math.min(Math.max(1, page), totalPages);
}

export function buildOrganizerRegistrationsListQueryString(input: {
  page?: number;
  pageSize?: number;
  sort?: OrganizerRegistrationsSortKey;
  sortDir?: OrganizerRegistrationsSortDir;
  statusFilter?: string[] | null;
  tierFilter?: string[] | null;
}): string {
  const params = new URLSearchParams();
  if (input.page && input.page > 1) params.set("page", String(input.page));
  if (
    input.pageSize &&
    input.pageSize !== ORGANIZER_REGISTRATIONS_DEFAULT_PAGE_SIZE
  ) {
    params.set("pageSize", String(input.pageSize));
  }
  if (input.sort && input.sort !== "name") params.set("sort", input.sort);
  if (input.sortDir && input.sortDir !== "asc") {
    params.set("sortDir", input.sortDir);
  }
  if (input.statusFilter?.length) {
    params.set("status", input.statusFilter.join(","));
  }
  if (input.tierFilter?.length) {
    params.set("tier", input.tierFilter.join(","));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
