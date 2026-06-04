import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canManageEvent, getCurrentUser } from "@/lib/auth";
import {
  closeJudgeBallotCategory,
  openJudgeBallotCategory,
} from "@/lib/judging/judge-ballot-allocation";
import { DEFAULT_BALLOT_VOTES_PER_JUDGE } from "@/lib/judging/judge-ballot-authorization";

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

  const categories = await prisma.judgeBallotCategory.findMany({
    where: { eventId },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      sortOrder: true,
      status: true,
      votesPerJudge: true,
      maxVotesPerJudgePerVehicle: true,
      requiresSpecialJudge: true,
      judgeGuidance: true,
      eventAwardId: true,
      eligibleClasses: { select: { eventCategoryId: true } },
      judgeAssignments: { select: { judgeUserId: true } },
      specialJudgeAssignments: { select: { judgeUserId: true } },
      _count: { select: { votes: true, allocations: true } },
    },
  });

  return NextResponse.json({ categories });
}

export async function POST(request: Request, { params }: RouteParams) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = (body ?? {}) as {
    name?: string;
    description?: string;
    eventCategoryId?: string;
    votesPerJudge?: number;
    maxVotesPerJudgePerVehicle?: number;
    judgeGuidance?: string;
    eligibleEventCategoryIds?: string[];
    assignedJudgeUserIds?: string[];
    requiresSpecialJudge?: boolean;
    assignedSpecialJudgeUserIds?: string[];
    sortOrder?: number;
  };

  const eventCategoryId = data.eventCategoryId?.trim();
  let eligibleEventCategoryIds = data.eligibleEventCategoryIds;
  let name = data.name?.trim();

  if (eventCategoryId) {
    const eventCategory = await prisma.eventCategory.findFirst({
      where: { id: eventCategoryId, eventId },
      include: { category: true },
    });
    if (!eventCategory) {
      return NextResponse.json(
        { error: "Vehicle class not found for this event." },
        { status: 400 },
      );
    }

    const alreadyUsed = await prisma.judgeBallotEligibleClass.findFirst({
      where: {
        eventCategoryId,
        category: { eventId },
      },
    });
    if (alreadyUsed) {
      return NextResponse.json(
        {
          error:
            "Judge ballot voting is already configured for this vehicle class.",
        },
        { status: 400 },
      );
    }

    eligibleEventCategoryIds = [eventCategoryId];
    if (!name) {
      name =
        eventCategory.customName?.trim() ||
        eventCategory.category?.name ||
        "Vehicle Class";
    }
  }

  if (!name) {
    return NextResponse.json(
      { error: "Select at least one vehicle class." },
      { status: 400 },
    );
  }

  const votesPerJudge = data.votesPerJudge ?? DEFAULT_BALLOT_VOTES_PER_JUDGE;
  if (!Number.isInteger(votesPerJudge) || votesPerJudge < 1) {
    return NextResponse.json(
      { error: "votesPerJudge must be a positive integer." },
      { status: 400 },
    );
  }

  const maxPerVehicle = data.maxVotesPerJudgePerVehicle ?? 1;
  if (!Number.isInteger(maxPerVehicle) || maxPerVehicle < 1) {
    return NextResponse.json(
      { error: "maxVotesPerJudgePerVehicle must be a positive integer." },
      { status: 400 },
    );
  }

  const requiresSpecialJudge = Boolean(data.requiresSpecialJudge);

  const category = await prisma.judgeBallotCategory.create({
    data: {
      eventId,
      name,
      description: null,
      votesPerJudge,
      maxVotesPerJudgePerVehicle: maxPerVehicle,
      judgeGuidance: data.judgeGuidance?.trim() || null,
      sortOrder: data.sortOrder ?? 0,
      requiresSpecialJudge,
      eligibleClasses: eligibleEventCategoryIds?.length
        ? {
            create: eligibleEventCategoryIds.map((id) => ({
              eventCategoryId: id,
            })),
          }
        : undefined,
      judgeAssignments:
        !requiresSpecialJudge && data.assignedJudgeUserIds?.length
          ? {
              create: data.assignedJudgeUserIds.map((judgeUserId) => ({
                judgeUserId,
              })),
            }
          : undefined,
      specialJudgeAssignments:
        requiresSpecialJudge && data.assignedSpecialJudgeUserIds?.length
          ? {
              create: data.assignedSpecialJudgeUserIds.map((judgeUserId) => ({
                judgeUserId,
              })),
            }
          : undefined,
    },
    include: {
      eligibleClasses: { select: { eventCategoryId: true } },
      judgeAssignments: { select: { judgeUserId: true } },
      specialJudgeAssignments: { select: { judgeUserId: true } },
    },
  });

  return NextResponse.json({ category }, { status: 201 });
}
