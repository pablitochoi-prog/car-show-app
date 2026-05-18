import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { listMasterCategoriesForPicker } from "@/lib/master-categories";

type Ctx = { params: Promise<{ id: string }> };

/** Master vehicle classes not yet added to this event (for organizer pick list). */
export async function GET(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await ctx.params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { orgId: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const allowed = await canManageEvent(
    user.id,
    eventId,
    event.orgId,
    user.platformRole,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [master, eventRows] = await Promise.all([
    listMasterCategoriesForPicker(),
    prisma.eventCategory.findMany({
      where: { eventId },
      select: { categoryId: true },
    }),
  ]);

  const addedIds = new Set(
    eventRows
      .map((row) => row.categoryId)
      .filter((id): id is string => Boolean(id)),
  );

  const available = master.filter((category) => !addedIds.has(category.id));

  return NextResponse.json({
    categories: available,
    masterCount: master.length,
    eventCount: eventRows.length,
  });
}
