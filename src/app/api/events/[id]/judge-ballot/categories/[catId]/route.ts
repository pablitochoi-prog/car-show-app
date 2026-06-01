import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canManageEvent, getCurrentUser } from "@/lib/auth";
import {
  closeJudgeBallotCategory,
  openJudgeBallotCategory,
} from "@/lib/judging/judge-ballot-allocation";

type RouteParams = { params: Promise<{ id: string; catId: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, catId } = await params;
  const allowed = await canManageEvent(
    user.id,
    eventId,
    undefined,
    user.platformRole,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.judgeBallotCategory.findFirst({
    where: { id: catId, eventId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    action,
    name,
    description,
    judgeGuidance,
    votesPerJudge,
    maxVotesPerJudgePerVehicle,
    eligibleEventCategoryIds,
    assignedJudgeUserIds,
  } = (body ?? {}) as {
    action?: "open" | "close" | "finalize";
    name?: string;
    description?: string;
    judgeGuidance?: string;
    votesPerJudge?: number;
    maxVotesPerJudgePerVehicle?: number;
    eligibleEventCategoryIds?: string[];
    assignedJudgeUserIds?: string[];
  };

  if (action === "open") {
    if (existing.status !== "DRAFT" && existing.status !== "CLOSED") {
      return NextResponse.json(
        { error: "Category cannot be opened from its current status." },
        { status: 400 },
      );
    }
    const { category, allocationCount } = await openJudgeBallotCategory(catId);
    return NextResponse.json({ category, allocationCount });
  }

  if (action === "close") {
    const category = await closeJudgeBallotCategory(catId, "CLOSED");
    return NextResponse.json({ category });
  }

  if (action === "finalize") {
    const category = await closeJudgeBallotCategory(catId, "FINALIZED");
    return NextResponse.json({ category });
  }

  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft categories can be edited." },
      { status: 400 },
    );
  }

  const category = await prisma.$transaction(async (tx) => {
    if (eligibleEventCategoryIds !== undefined) {
      await tx.judgeBallotEligibleClass.deleteMany({ where: { categoryId: catId } });
      if (eligibleEventCategoryIds.length > 0) {
        await tx.judgeBallotEligibleClass.createMany({
          data: eligibleEventCategoryIds.map((eventCategoryId) => ({
            categoryId: catId,
            eventCategoryId,
          })),
        });
      }
    }

    if (assignedJudgeUserIds !== undefined) {
      await tx.judgeBallotCategoryJudge.deleteMany({ where: { categoryId: catId } });
      if (assignedJudgeUserIds.length > 0) {
        await tx.judgeBallotCategoryJudge.createMany({
          data: assignedJudgeUserIds.map((judgeUserId) => ({
            categoryId: catId,
            judgeUserId,
          })),
        });
      }
    }

    return tx.judgeBallotCategory.update({
      where: { id: catId },
      data: {
        name: name?.trim() || undefined,
        description:
          description !== undefined ? description.trim() || null : undefined,
        judgeGuidance:
          judgeGuidance !== undefined ? judgeGuidance.trim() || null : undefined,
        votesPerJudge: votesPerJudge !== undefined ? votesPerJudge : undefined,
        maxVotesPerJudgePerVehicle:
          maxVotesPerJudgePerVehicle !== undefined
            ? maxVotesPerJudgePerVehicle
            : undefined,
      },
      include: {
        eligibleClasses: { select: { eventCategoryId: true } },
        judgeAssignments: { select: { judgeUserId: true } },
      },
    });
  });

  return NextResponse.json({ category });
}
