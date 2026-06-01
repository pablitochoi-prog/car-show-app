import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canManageEvent, getCurrentUser } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const allowed = await canManageEvent(
    user.id,
    eventId,
    undefined,
    user.platformRole,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const templates = await prisma.eventJudgingTemplate.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    include: {
      sourceTemplate: { select: { id: true, slug: true, name: true } },
      _count: { select: { sections: true, scoreSheets: true } },
    },
  });

  return NextResponse.json({ templates });
}
