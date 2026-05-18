import type { EventStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  sortStaffRoleBadgeRowsForDisplay,
  type StaffRoleBadgeRow,
} from "@/lib/event-role-labels";
import type { EventCardBrandingFields } from "@/lib/event-card-branding";

function eventStaffMemberDelegate() {
  return (
    prisma as unknown as {
      eventStaffMember?: {
        count: (args: {
          where: { userId: string };
        }) => Promise<number>;
        findMany: (args: unknown) => Promise<unknown[]>;
      };
    }
  ).eventStaffMember;
}

/** Events where the user holds the default organizer role (includes shows they created). */
export async function countUserOrganizerStaffEvents(
  userId: string,
): Promise<number> {
  const rows = await prisma.$queryRaw<[{ c: bigint }]>`
    SELECT COUNT(DISTINCT esm."eventId")::bigint AS c
    FROM event_staff_members esm
    INNER JOIN event_staff_role_links esrl ON esrl."staffMemberId" = esm.id
    INNER JOIN event_role_definitions erd ON erd.id = esrl."roleId"
    WHERE esm."userId" = ${userId}
      AND erd.slug = 'organizer'
  `;
  return Number(rows[0]?.c ?? 0);
}

/** Avoids runtime crash when an outdated bundled Prisma client omits new delegates (run `npx prisma generate` + restart dev server). */
export async function countUserManagingEvents(userId: string): Promise<number> {
  const d = eventStaffMemberDelegate();
  if (d?.count) {
    return d.count({ where: { userId } });
  }

  const rows = await prisma.$queryRaw<[{ c: bigint }]>`
    SELECT COUNT(*)::bigint AS c
    FROM event_staff_members
    WHERE "userId" = ${userId}
  `;
  return Number(rows[0]?.c ?? 0);
}

type ManagingRowRaw = {
  eventId: string;
  name: string;
  showNumber: number;
  logoUrl: string | null;
  orgName: string | null;
  orgLogoUrl: string | null;
  startDate: Date;
  startTime: string | null;
  city: string | null;
  state: string | null;
  status: string;
  roles: StaffRoleBadgeRow[] | null;
};

export type DashboardManagingEventRow = {
  eventId: string;
  name: string;
  showNumber: number;
  startDate: Date;
  startTime: string | null;
  city: string | null;
  state: string | null;
  status: EventStatus;
  roles: StaffRoleBadgeRow[];
} & EventCardBrandingFields;

export async function loadManagingEventRowsPage(
  userId: string,
  skip: number,
  take: number,
): Promise<DashboardManagingEventRow[]> {
  const d = eventStaffMemberDelegate();
  if (d?.findMany) {
    const staffMembers = await d.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            showNumber: true,
            logoUrl: true,
            startDate: true,
            startTime: true,
            city: true,
            state: true,
            status: true,
            organization: { select: { name: true, logo: true } },
          },
        },
        roleLinks: {
          include: {
            role: {
              select: {
                id: true,
                slug: true,
                name: true,
                sortOrder: true,
              },
            },
          },
        },
      },
      orderBy: { event: { startDate: "asc" } },
      skip,
      take,
    });

    return (staffMembers as {
      event: {
        id: string;
        name: string;
        showNumber: number;
        logoUrl: string | null;
        startDate: Date;
        startTime: string | null;
        city: string | null;
        state: string | null;
        status: EventStatus;
        organization: { name: string; logo: string | null } | null;
      };
      roleLinks: { role: StaffRoleBadgeRow & { sortOrder: number } }[];
    }[]).map((m) => ({
      eventId: m.event.id,
      name: m.event.name,
      showNumber: m.event.showNumber,
      startDate: m.event.startDate,
      startTime: m.event.startTime,
      city: m.event.city,
      state: m.event.state,
      status: m.event.status,
      logoUrl: m.event.logoUrl,
      orgName: m.event.organization?.name ?? null,
      orgLogoUrl: m.event.organization?.logo ?? null,
      roles: sortStaffRoleBadgeRowsForDisplay(
        m.roleLinks.map((l) => ({
          id: l.role.id,
          slug: l.role.slug,
          name: l.role.name,
        })),
      ),
    }));
  }

  const raw = await prisma.$queryRaw<ManagingRowRaw[]>`
    SELECT
      e.id AS "eventId",
      e.name,
      e."showNumber" AS "showNumber",
      e."logoUrl" AS "logoUrl",
      o.name AS "orgName",
      o.logo AS "orgLogoUrl",
      e."startDate" AS "startDate",
      e."startTime" AS "startTime",
      e.city,
      e.state,
      e.status::text AS status,
      COALESCE(
        json_agg(
          json_build_object(
            'id', erd.id,
            'slug', erd.slug,
            'name', erd.name,
            'sortOrder', erd."sortOrder"
          )
          ORDER BY erd."sortOrder" ASC, erd.name ASC
        ) FILTER (WHERE erd.id IS NOT NULL),
        '[]'::json
      ) AS roles
    FROM event_staff_members esm
    INNER JOIN events e ON e.id = esm."eventId"
    LEFT JOIN organizations o ON o.id = e."orgId"
    LEFT JOIN event_staff_role_links esrl ON esrl."staffMemberId" = esm.id
    LEFT JOIN event_role_definitions erd ON erd.id = esrl."roleId"
    WHERE esm."userId" = ${userId}
    GROUP BY esm.id, e.id, e.name, e."showNumber", e."logoUrl", o.name, o.logo, e."startDate", e."startTime", e.city, e.state, e.status
    ORDER BY e."startDate" ASC
    LIMIT ${take} OFFSET ${skip}
  `;

  return raw.map((row) => ({
    eventId: row.eventId,
    name: row.name,
    showNumber: row.showNumber,
    logoUrl: row.logoUrl,
    orgName: row.orgName,
    orgLogoUrl: row.orgLogoUrl,
    startDate: row.startDate,
    startTime: row.startTime,
    city: row.city,
    state: row.state,
    status: row.status as EventStatus,
    roles: sortStaffRoleBadgeRowsForDisplay(
      Array.isArray(row.roles) ? row.roles : [],
    ),
  }));
}
