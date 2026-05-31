import type { Prisma } from "@prisma/client";
import type { AdminTableConfig, ParsedAdminTableParams } from "./types";

export const PLATFORM_ROLES = ["USER", "ORGANIZER", "ADMIN"] as const;
export const USER_STATUSES = ["ACTIVE", "SUSPENDED", "BANNED"] as const;

export const usersAdminTableConfig: AdminTableConfig = {
  prefix: "users",
  defaultSort: "createdAt",
  defaultSortDir: "desc",
  defaultPageSize: 25,
  maxPageSize: 100,
  columns: [
    { id: "firstName", sortable: true, filterable: true, filterType: "text" },
    { id: "lastName", sortable: true, filterable: true, filterType: "text" },
    { id: "email", sortable: true, filterable: true, filterType: "text" },
    {
      id: "platformRole",
      sortable: true,
      filterable: true,
      filterType: "enum",
      enumValues: PLATFORM_ROLES,
    },
    {
      id: "status",
      sortable: true,
      filterable: true,
      filterType: "enum",
      enumValues: USER_STATUSES,
    },
    { id: "createdAt", sortable: true, filterable: false },
    { id: "createdAtFrom", filterable: true, filterType: "dateFrom" },
    { id: "createdAtTo", filterable: true, filterType: "dateTo" },
  ],
};

function parseIsoDateStart(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  return new Date(`${ymd}T00:00:00.000Z`);
}

function parseIsoDateEnd(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  return new Date(`${ymd}T23:59:59.999Z`);
}

export function buildUsersAdminWhere(
  params: ParsedAdminTableParams,
): Prisma.UserWhereInput {
  const and: Prisma.UserWhereInput[] = [];

  if (params.q) {
    and.push({
      OR: [
        { firstName: { contains: params.q, mode: "insensitive" } },
        { lastName: { contains: params.q, mode: "insensitive" } },
        { name: { contains: params.q, mode: "insensitive" } },
        { email: { contains: params.q, mode: "insensitive" } },
      ],
    });
  }

  if (params.filters.firstName) {
    and.push({
      firstName: { contains: params.filters.firstName, mode: "insensitive" },
    });
  }
  if (params.filters.lastName) {
    and.push({
      lastName: { contains: params.filters.lastName, mode: "insensitive" },
    });
  }
  if (params.filters.email) {
    and.push({ email: { contains: params.filters.email, mode: "insensitive" } });
  }
  if (
    params.filters.platformRole &&
    PLATFORM_ROLES.includes(params.filters.platformRole as (typeof PLATFORM_ROLES)[number])
  ) {
    and.push({
      platformRole: params.filters.platformRole as (typeof PLATFORM_ROLES)[number],
    });
  }
  if (
    params.filters.status &&
    USER_STATUSES.includes(params.filters.status as (typeof USER_STATUSES)[number])
  ) {
    and.push({ status: params.filters.status as (typeof USER_STATUSES)[number] });
  }

  const from = parseIsoDateStart(params.filters.createdAtFrom ?? "");
  const to = parseIsoDateEnd(params.filters.createdAtTo ?? "");
  if (from) and.push({ createdAt: { gte: from } });
  if (to) and.push({ createdAt: { lte: to } });

  return and.length ? { AND: and } : {};
}

export function buildUsersAdminOrderBy(
  params: ParsedAdminTableParams,
): Prisma.UserOrderByWithRelationInput {
  const dir = params.sortDir;
  switch (params.sort) {
    case "firstName":
      return { firstName: dir };
    case "lastName":
      return { lastName: dir };
    case "email":
      return { email: dir };
    case "platformRole":
      return { platformRole: dir };
    case "status":
      return { status: dir };
    case "createdAt":
      return { createdAt: dir };
    default:
      return { createdAt: "desc" };
  }
}
