import { NextResponse } from "next/server";
import { EventStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireOrgMember } from "@/lib/auth";

type RouteParams = { params: Promise<{ orgId: string }> };

/** Events for this org that have not ended yet (future start, or multi-day still ongoing). */
export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;
  if (!orgId) {
    return NextResponse.json({ error: "Missing organization id" }, { status: 400 });
  }

  try {
    await requireOrgMember(user.id, orgId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();

  const events = await prisma.event.findMany({
    where: {
      orgId,
      status: {
        notIn: [EventStatus.CLOSED, EventStatus.ARCHIVED],
      },
      OR: [{ startDate: { gte: now } }, { endDate: { gte: now } }],
    },
    orderBy: { startDate: "asc" },
    take: 100,
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      venue: true,
      city: true,
      state: true,
      status: true,
    },
  });

  return NextResponse.json({ events });
}
