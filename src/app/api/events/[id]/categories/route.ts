import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await ctx.params;

  const rows = await prisma.eventCategory.findMany({
    where: { eventId },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const categories = rows.map((r) => ({
    id: r.id,
    categoryId: r.categoryId,
    name: r.category?.name ?? r.customName ?? "Custom",
    trophyCount: r.trophyCount,
    isCustom: !r.categoryId,
  }));

  return NextResponse.json({ categories });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await ctx.params;
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { orgId: true } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const allowed = await canManageEvent(user.id, eventId, event.orgId, user.platformRole);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as {
    categoryId?: string;
    customName?: string;
    trophyCount?: number;
  };

  const trophyCount = Math.max(1, Math.min(body.trophyCount ?? 1, 20));

  if (body.categoryId) {
    const exists = await prisma.eventCategory.findUnique({
      where: { eventId_categoryId: { eventId, categoryId: body.categoryId } },
    });
    if (exists) {
      return NextResponse.json({ error: "Category already added to this event." }, { status: 409 });
    }
    await prisma.eventCategory.create({
      data: { eventId, categoryId: body.categoryId, trophyCount },
    });
  } else if (body.customName?.trim()) {
    await prisma.eventCategory.create({
      data: { eventId, customName: body.customName.trim(), trophyCount },
    });
  } else {
    return NextResponse.json({ error: "Provide categoryId or customName." }, { status: 400 });
  }

  return refetch(eventId);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await ctx.params;
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { orgId: true } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const allowed = await canManageEvent(user.id, eventId, event.orgId, user.platformRole);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as { eventCategoryId: string; trophyCount: number };
  if (!body.eventCategoryId) {
    return NextResponse.json({ error: "eventCategoryId required." }, { status: 400 });
  }

  await prisma.eventCategory.update({
    where: { id: body.eventCategoryId },
    data: { trophyCount: Math.max(1, Math.min(body.trophyCount ?? 1, 20)) },
  });

  return refetch(eventId);
}

export async function DELETE(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await ctx.params;
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { orgId: true } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const allowed = await canManageEvent(user.id, eventId, event.orgId, user.platformRole);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const ecId = searchParams.get("eventCategoryId");
  if (!ecId) return NextResponse.json({ error: "eventCategoryId required." }, { status: 400 });

  await prisma.eventCategory.deleteMany({ where: { id: ecId, eventId } });

  return refetch(eventId);
}

async function refetch(eventId: string) {
  const rows = await prisma.eventCategory.findMany({
    where: { eventId },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const categories = rows.map((r) => ({
    id: r.id,
    categoryId: r.categoryId,
    name: r.category?.name ?? r.customName ?? "Custom",
    trophyCount: r.trophyCount,
    isCustom: !r.categoryId,
  }));
  return NextResponse.json({ categories });
}
