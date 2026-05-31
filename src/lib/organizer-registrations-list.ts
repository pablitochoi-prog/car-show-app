import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { OrganizerRegistrationInput } from "@/lib/organizer-registration-rows";
import {
  buildOrganizerRegistrationsOrderBy,
  buildOrganizerRegistrationsWhere,
  clampOrganizerRegistrationsPage,
  type OrganizerRegistrationsListParams,
} from "@/lib/organizer-registrations-list-query";

export {
  ORGANIZER_REGISTRATIONS_DEFAULT_PAGE_SIZE,
  ORGANIZER_REGISTRATIONS_MAX_PAGE_SIZE,
  ORGANIZER_REGISTRATION_STATUS_FILTER_LABELS,
  buildOrganizerRegistrationsListQueryString,
  buildOrganizerRegistrationsOrderBy,
  buildOrganizerRegistrationsWhere,
  clampOrganizerRegistrationsPage,
  parseOrganizerRegistrationsSearchParams,
  type OrganizerRegistrationsListParams,
  type OrganizerRegistrationsSortDir,
  type OrganizerRegistrationsSortKey,
} from "@/lib/organizer-registrations-list-query";

export const organizerRegistrationListSelect = {
  id: true,
  userId: true,
  status: true,
  paymentStatus: true,
  amountCents: true,
  platformFeeCents: true,
  refundedCents: true,
  createdAt: true,
  user: {
    select: {
      name: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  },
  tier: { select: { name: true, priceCents: true } },
  vehicles: { select: { id: true } },
  guestFirstName: true,
  guestLastName: true,
  guestEmail: true,
  guestPhone: true,
  registrantFirstName: true,
  registrantLastName: true,
  registrantEmail: true,
  registrantPhone: true,
  guestVehicles: true,
} satisfies Prisma.RegistrationSelect;

type RawRegistrationRow = Prisma.RegistrationGetPayload<{
  select: typeof organizerRegistrationListSelect;
}>;

export function mapOrganizerRegistrationRow(
  r: RawRegistrationRow,
): OrganizerRegistrationInput {
  return {
    id: r.id,
    userId: r.userId,
    status: r.status,
    paymentStatus: r.paymentStatus,
    amountCents: r.amountCents,
    platformFeeCents: r.platformFeeCents,
    refundedCents: r.refundedCents,
    createdAt: r.createdAt.toISOString(),
    tierName: r.tier.name,
    tierPriceCents: r.tier.priceCents,
    vehicles: r.vehicles,
    guestVehicles: r.guestVehicles,
    user: r.user,
    guestFirstName: r.guestFirstName,
    guestLastName: r.guestLastName,
    guestEmail: r.guestEmail,
    guestPhone: r.guestPhone,
    registrantFirstName: r.registrantFirstName,
    registrantLastName: r.registrantLastName,
    registrantEmail: r.registrantEmail,
    registrantPhone: r.registrantPhone,
  };
}

export type OrganizerRegistrationsPageResult = {
  rows: OrganizerRegistrationInput[];
  totalCount: number;
  eventTotalCount: number;
  tierFilterOptions: string[];
  page: number;
  pageSize: number;
  totalPages: number;
  params: OrganizerRegistrationsListParams;
};

export async function loadOrganizerRegistrationsPage(
  eventId: string,
  rawParams: OrganizerRegistrationsListParams,
): Promise<OrganizerRegistrationsPageResult> {
  const where = buildOrganizerRegistrationsWhere(eventId, rawParams);
  const orderBy = buildOrganizerRegistrationsOrderBy(rawParams);

  const [totalCount, eventTotalCount, tierRows] = await Promise.all([
    prisma.registration.count({ where }),
    prisma.registration.count({ where: { eventId } }),
    prisma.registration.findMany({
      where: { eventId },
      select: { tier: { select: { name: true } } },
      distinct: ["tierId"],
      orderBy: { tier: { name: "asc" } },
    }),
  ]);

  const page = clampOrganizerRegistrationsPage(
    rawParams.page,
    totalCount,
    rawParams.pageSize,
  );
  const totalPages = Math.max(
    1,
    Math.ceil(Math.max(totalCount, 1) / rawParams.pageSize),
  );
  const skip = (page - 1) * rawParams.pageSize;

  const rawRows = await prisma.registration.findMany({
    where,
    select: organizerRegistrationListSelect,
    orderBy,
    skip,
    take: rawParams.pageSize,
  });

  return {
    rows: rawRows.map(mapOrganizerRegistrationRow),
    totalCount,
    eventTotalCount,
    tierFilterOptions: tierRows.map((row) => row.tier.name),
    page,
    pageSize: rawParams.pageSize,
    totalPages,
    params: { ...rawParams, page },
  };
}
