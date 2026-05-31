import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import { parseAdminTableParams } from "@/lib/admin-table/parse-admin-table-params";
import {
  adminTableMeta,
  adminTableSkip,
} from "@/lib/admin-table/admin-table-response";
import {
  buildEventsAdminOrderBy,
  buildEventsAdminWhere,
  eventsAdminTableConfig,
} from "@/lib/admin-table/events-table-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES = [
  "DRAFT", "SCHEDULED", "PUBLISHED", "ACTIVE", "VOTING", "CLOSED", "ARCHIVED",
];

function organizerDisplayName(user: {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
}): string {
  const name = user.name?.trim();
  if (name) return name;
  const fromParts = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fromParts || "Event organizer";
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const params = parseAdminTableParams(
    req.nextUrl.searchParams,
    eventsAdminTableConfig,
  );
  const where = buildEventsAdminWhere(params);
  const orderBy = buildEventsAdminOrderBy(params);
  const skip = adminTableSkip(params.page, params.pageSize);

  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy,
      skip,
      take: params.pageSize,
      select: {
        id: true,
        name: true,
        showNumber: true,
        city: true,
        state: true,
        startDate: true,
        status: true,
        orgId: true,
        organization: { select: { name: true } },
        staffMembers: {
          where: {
            roleLinks: { some: { role: { slug: "organizer" } } },
          },
          include: {
            user: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { registrations: true } },
      },
    }),
  ]);

  return NextResponse.json({
    events: events.map((e) => {
      const organizers = e.staffMembers.map((member) => ({
        name: organizerDisplayName(member.user),
        email: member.user.email,
      }));
      return {
        id: e.id,
        name: e.name,
        showNumber: e.showNumber,
        city: e.city,
        state: e.state,
        startDate: e.startDate.toISOString(),
        status: e.status,
        orgName: e.organization?.name ?? null,
        organizers,
        registrants: e._count.registrations,
      };
    }),
    meta: adminTableMeta(total, params.page, params.pageSize),
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as {
    id?: string;
    name?: string;
    city?: string;
    state?: string;
    status?: string;
  };
  if (!body.id)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (body.status && !VALID_STATUSES.includes(body.status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.name?.trim()) data.name = body.name.trim();
  if (body.city !== undefined) data.city = body.city?.trim() || null;
  if (body.state !== undefined) data.state = body.state?.trim() || null;
  if (body.status) data.status = body.status;

  const event = await prisma.event.update({
    where: { id: body.id },
    data,
    select: { id: true, name: true, city: true, state: true, status: true },
  });

  return NextResponse.json({ event });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.event.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
