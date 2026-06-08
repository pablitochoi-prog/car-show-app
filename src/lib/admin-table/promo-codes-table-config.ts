import type { Prisma } from "@prisma/client";
import type { AdminTableConfig, ParsedAdminTableParams } from "./types";
import {
  applyTextFilterToFields,
  parseTextFilter,
  prismaStringFilter,
} from "./text-filter";

const PROMO_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "RESERVED",
  "REDEEMED",
  "EXPIRED",
  "REVOKED",
  "ARCHIVED",
] as const;

export const promoCodesAdminTableConfig: AdminTableConfig = {
  prefix: "promo",
  defaultSort: "createdAt",
  defaultSortDir: "desc",
  defaultPageSize: 25,
  maxPageSize: 100,
  columns: [
    { id: "code", sortable: true, filterable: true, filterType: "text" },
    {
      id: "status",
      sortable: true,
      filterable: true,
      filterType: "enum",
      enumValues: PROMO_STATUSES,
    },
    { id: "createdAt", sortable: true, filterable: false },
    { id: "updatedAt", sortable: true, filterable: false },
    { id: "expiresAt", sortable: true, filterable: false },
    {
      id: "organization",
      sortable: false,
      filterable: true,
      filterType: "text",
    },
    {
      id: "eventName",
      sortable: false,
      filterable: true,
      filterType: "text",
    },
    {
      id: "eventState",
      sortable: false,
      filterable: true,
      filterType: "text",
    },
    { id: "redeemedBy", sortable: false, filterable: false },
    { id: "redeemedAt", sortable: true, filterable: false },
  ],
};

export function buildPromoCodesAdminWhere(
  params: ParsedAdminTableParams,
): Prisma.PlatformFeePromoCodeWhereInput {
  const and: Prisma.PlatformFeePromoCodeWhereInput[] = [];

  if (params.q) {
    const term = params.q;
    and.push({
      OR: [
        { code: { contains: term, mode: "insensitive" } },
        { internalNotes: { contains: term, mode: "insensitive" } },
      ],
    });
  }

  if (params.filters.code) {
    const clause = applyTextFilterToFields(["code"], params.filters.code);
    if (clause) and.push(clause);
  }

  if (params.filters.status) {
    const { value } = parseTextFilter(params.filters.status);
    if (value && PROMO_STATUSES.includes(value as (typeof PROMO_STATUSES)[number])) {
      and.push({ status: value as (typeof PROMO_STATUSES)[number] });
    }
  }

  if (params.filters.organization) {
    const clause = applyTextFilterToFields(
      ["redeemedOrganizationName", "reservedOrganizationName"],
      params.filters.organization,
    );
    if (clause) and.push(clause);
  }

  if (params.filters.eventName) {
    const clause = applyTextFilterToFields(
      ["redeemedEventName", "reservedEventName"],
      params.filters.eventName,
    );
    if (clause) and.push(clause);
  }

  if (params.filters.eventState) {
    const clause = applyTextFilterToFields(
      ["redeemedEventState", "reservedEventState"],
      params.filters.eventState,
    );
    if (clause) and.push(clause);
  }

  return and.length > 0 ? { AND: and } : {};
}

export function buildPromoCodesAdminOrderBy(
  params: ParsedAdminTableParams,
): Prisma.PlatformFeePromoCodeOrderByWithRelationInput {
  const dir = params.sortDir;
  switch (params.sort) {
    case "code":
      return { code: dir };
    case "status":
      return { status: dir };
    case "updatedAt":
      return { updatedAt: dir };
    case "expiresAt":
      return { expiresAt: dir };
    case "redeemedAt":
      return { redeemedAt: dir };
    case "createdAt":
    default:
      return { createdAt: dir };
  }
}
