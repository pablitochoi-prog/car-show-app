import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await ctx.params;
  return refetch(eventId);
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
    specialAwardId?: string;
    customName?: string;
  };

  if (body.specialAwardId) {
    const exists = await prisma.eventAward.findUnique({
      where: { eventId_specialAwardId: { eventId, specialAwardId: body.specialAwardId } },
    });
    if (exists) {
      return NextResponse.json({ error: "Award already added to this event." }, { status: 409 });
    }
    await prisma.eventAward.create({
      data: { eventId, specialAwardId: body.specialAwardId },
    });
  } else if (body.customName?.trim()) {
    await prisma.eventAward.create({
      data: { eventId, customName: body.customName.trim() },
    });
  } else {
    return NextResponse.json({ error: "Provide specialAwardId or customName." }, { status: 400 });
  }

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
  const eaId = searchParams.get("eventAwardId");
  if (!eaId) return NextResponse.json({ error: "eventAwardId required." }, { status: 400 });

  await prisma.eventAward.deleteMany({ where: { id: eaId, eventId } });

  return refetch(eventId);
}

async function refetch(eventId: string) {
  const rows = await prisma.eventAward.findMany({
    where: { eventId },
    include: { specialAward: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const awards = rows.map((r) => ({
    id: r.id,
    specialAwardId: r.specialAwardId,
    name: r.specialAward?.name ?? r.customName ?? "Custom Award",
    isCustom: !r.specialAwardId,
  }));
  return NextResponse.json({ awards });
}
