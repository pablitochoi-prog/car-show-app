import type { EventStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  sortStaffRoleBadgeRowsForDisplay,
  type StaffRoleBadgeRow,
} from "@/lib/event-role-labels";

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
  startDate: Date;
  startTime: string | null;
  city: string | null;
  state: string | null;
  status: EventStatus;
  roles: StaffRoleBadgeRow[];
};

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
            startDate: true,
            startTime: true,
            city: true,
            state: true,
            status: true,
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
        startDate: Date;
        startTime: string | null;
        city: string | null;
        state: string | null;
        status: EventStatus;
      };
      roleLinks: { role: StaffRoleBadgeRow & { sortOrder: number } }[];
    }[]).map((m) => ({
      eventId: m.event.id,
      name: m.event.name,
      startDate: m.event.startDate,
      startTime: m.event.startTime,
      city: m.event.city,
      state: m.event.state,
      status: m.event.status,
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
    LEFT JOIN event_staff_role_links esrl ON esrl."staffMemberId" = esm.id
    LEFT JOIN event_role_definitions erd ON erd.id = esrl."roleId"
    WHERE esm."userId" = ${userId}
    GROUP BY esm.id, e.id, e.name, e."startDate", e."startTime", e.city, e.state, e.status
    ORDER BY e."startDate" ASC
    LIMIT ${take} OFFSET ${skip}
  `;

  return raw.map((row) => ({
    eventId: row.eventId,
    name: row.name,
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
