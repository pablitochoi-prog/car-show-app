import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { getEventStaffList } from "@/lib/event-staff";
import { loadEventAwardBallotConfigs } from "@/lib/judging/event-award-ballot-link";

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
    specialAwardIds?: string[];
    customName?: string;
  };

  if (Array.isArray(body.specialAwardIds) && body.specialAwardIds.length > 0) {
    const uniqueIds = [...new Set(body.specialAwardIds.filter(Boolean))];
    for (const specialAwardId of uniqueIds) {
      const exists = await prisma.eventAward.findUnique({
        where: { eventId_specialAwardId: { eventId, specialAwardId } },
      });
      if (exists) continue;
      await prisma.eventAward.create({
        data: { eventId, specialAwardId },
      });
    }
    return refetch(eventId);
  }

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

  let eventAwardIds: string[] = [];
  try {
    const body = (await req.json()) as { eventAwardIds?: string[] };
    if (Array.isArray(body.eventAwardIds)) {
      eventAwardIds = body.eventAwardIds.filter(Boolean);
    }
  } catch {
    // no JSON body
  }

  const { searchParams } = new URL(req.url);
  const eaId = searchParams.get("eventAwardId");
  if (eaId) eventAwardIds.push(eaId);

  if (eventAwardIds.length === 0) {
    return NextResponse.json({ error: "eventAwardId required." }, { status: 400 });
  }

  await prisma.eventAward.deleteMany({
    where: { eventId, id: { in: [...new Set(eventAwardIds)] } },
  });

  return refetch(eventId);
}

async function refetch(eventId: string) {
  const [rows, ballotConfigs, staff] = await Promise.all([
    prisma.eventAward.findMany({
      where: { eventId },
      include: { specialAward: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    loadEventAwardBallotConfigs(eventId),
    getEventStaffList(eventId),
  ]);

  const configByAwardId = new Map(
    ballotConfigs.map((c) => [c.eventAwardId, c]),
  );

  const awards = rows.map((r) => {
    const cfg = configByAwardId.get(r.id);
    return {
      id: r.id,
      specialAwardId: r.specialAwardId,
      name: r.specialAward?.name ?? r.customName ?? "Custom Award",
      isCustom: !r.specialAwardId,
      requiresSpecialJudge: cfg?.requiresSpecialJudge ?? false,
      assignedSpecialJudgeUserIds: cfg?.assignedSpecialJudgeUserIds ?? [],
      ballotCategoryId: cfg?.ballotCategoryId ?? null,
    };
  });

  const specialJudgeStaff = staff
    .filter((m) => m.roles.some((role) => role.slug === "special_judge"))
    .map((m) => ({
      userId: m.userId,
      name: m.name,
      email: m.email,
    }));

  return NextResponse.json({ awards, specialJudgeStaff });
}
