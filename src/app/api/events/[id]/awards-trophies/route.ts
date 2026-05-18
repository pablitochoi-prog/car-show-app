import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import {
  computeTrophyCountAfterRemovals,
  parseAwardTrophyEntryId,
} from "@/lib/event-awards-trophies";

type Ctx = { params: Promise<{ id: string }> };

async function refetch(eventId: string) {
  const [categoryRows, awardRows] = await Promise.all([
    prisma.eventCategory.findMany({
      where: { eventId },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.eventAward.findMany({
      where: { eventId },
      include: { specialAward: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const categories = categoryRows.map((r) => ({
    id: r.id,
    categoryId: r.categoryId,
    name: r.category?.name ?? r.customName ?? "Custom",
    trophyCount: r.trophyCount,
    isCustom: !r.categoryId,
  }));

  const awards = awardRows.map((r) => ({
    id: r.id,
    specialAwardId: r.specialAwardId,
    name: r.specialAward?.name ?? r.customName ?? "Custom Award",
    isCustom: !r.specialAwardId,
  }));

  return NextResponse.json({ categories, awards });
}

/** DELETE — remove awards/trophies (special awards + category place trophies). */
export async function DELETE(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await ctx.params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { orgId: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const allowed = await canManageEvent(
    user.id,
    eventId,
    event.orgId,
    user.platformRole,
  );
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { entryIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const entryIds = Array.isArray(body.entryIds)
    ? [...new Set(body.entryIds.filter(Boolean))]
    : [];
  if (entryIds.length === 0) {
    return NextResponse.json({ error: "entryIds required." }, { status: 400 });
  }

  const categoryRows = await prisma.eventCategory.findMany({
    where: { eventId },
    select: { id: true, trophyCount: true },
  });

  const placeEntryIds: string[] = [];
  const specialAwardIds: string[] = [];

  for (const entryId of entryIds) {
    const parsed = parseAwardTrophyEntryId(entryId);
    if (!parsed) {
      return NextResponse.json(
        { error: `Invalid entry id: ${entryId}` },
        { status: 400 },
      );
    }
    if (parsed.kind === "category_place") {
      placeEntryIds.push(entryId);
    } else {
      specialAwardIds.push(parsed.eventAwardId);
    }
  }

  if (specialAwardIds.length > 0) {
    await prisma.eventAward.deleteMany({
      where: { eventId, id: { in: specialAwardIds } },
    });
  }

  if (placeEntryIds.length > 0) {
    const nextCounts = computeTrophyCountAfterRemovals(
      categoryRows,
      placeEntryIds,
    );
    for (const row of categoryRows) {
      const trophyCount = nextCounts.get(row.id);
      if (trophyCount == null || trophyCount === row.trophyCount) continue;
      await prisma.eventCategory.update({
        where: { id: row.id },
        data: { trophyCount },
      });
    }
  }

  return refetch(eventId);
}
