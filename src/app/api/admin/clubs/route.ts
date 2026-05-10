import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const where = q
    ? { name: { contains: q, mode: "insensitive" as const } }
    : {};

  const clubs = await prisma.organization.findMany({
    where,
    orderBy: { name: "asc" },
    take: 100,
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      clubState: true,
      createdAt: true,
      archivedAt: true,
      _count: { select: { members: true, events: true } },
      members: {
        where: { role: "owner" },
        take: 1,
        select: { user: { select: { firstName: true, lastName: true, name: true } } },
      },
    },
  });

  return NextResponse.json({
    clubs: clubs.map((c) => {
      const owner = c.members[0]?.user;
      const ownerName = owner
        ? [owner.firstName, owner.lastName].filter(Boolean).join(" ") || owner.name
        : null;
      return {
        id: c.id,
        name: c.name,
        city: c.city,
        state: c.state,
        clubState: c.clubState,
        createdAt: c.createdAt.toISOString(),
        archived: !!c.archivedAt,
        memberCount: c._count.members,
        eventCount: c._count.events,
        organizer: ownerName,
      };
    }),
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
    archive?: boolean;
  };
  if (!body.id)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.name?.trim()) data.name = body.name.trim();
  if (body.city !== undefined) data.city = body.city?.trim() || null;
  if (body.state !== undefined) data.state = body.state?.trim() || null;
  if (body.archive === true) data.archivedAt = new Date();
  if (body.archive === false) data.archivedAt = null;

  const updated = await prisma.organization.update({
    where: { id: body.id },
    data,
    select: { id: true, name: true, city: true, state: true, archivedAt: true },
  });

  return NextResponse.json({
    club: { ...updated, archived: !!updated.archivedAt },
  });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.organization.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
