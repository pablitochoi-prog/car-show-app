import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canManageEvent, getCurrentUser } from "@/lib/auth";
import {
  closeJudgeBallotCategory,
  openJudgeBallotCategory,
} from "@/lib/judging/judge-ballot-allocation";

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
    include: {
      eligibleClasses: { select: { eventCategoryId: true } },
      judgeAssignments: { select: { judgeUserId: true } },
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
    votesPerJudge?: number;
    maxVotesPerJudgePerVehicle?: number;
    judgeGuidance?: string;
    eligibleEventCategoryIds?: string[];
    assignedJudgeUserIds?: string[];
    sortOrder?: number;
  };

  const name = data.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  const votesPerJudge = data.votesPerJudge ?? 5;
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

  const category = await prisma.judgeBallotCategory.create({
    data: {
      eventId,
      name,
      description: data.description?.trim() || null,
      votesPerJudge,
      maxVotesPerJudgePerVehicle: maxPerVehicle,
      judgeGuidance: data.judgeGuidance?.trim() || null,
      sortOrder: data.sortOrder ?? 0,
      eligibleClasses: data.eligibleEventCategoryIds?.length
        ? {
            create: data.eligibleEventCategoryIds.map((eventCategoryId) => ({
              eventCategoryId,
            })),
          }
        : undefined,
      judgeAssignments: data.assignedJudgeUserIds?.length
        ? {
            create: data.assignedJudgeUserIds.map((judgeUserId) => ({
              judgeUserId,
            })),
          }
        : undefined,
    },
    include: {
      eligibleClasses: { select: { eventCategoryId: true } },
      judgeAssignments: { select: { judgeUserId: true } },
    },
  });

  return NextResponse.json({ category }, { status: 201 });
}
