import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canManageEvent, getCurrentUser } from "@/lib/auth";
import {
  closeJudgeBallotCategory,
  openJudgeBallotCategory,
  syncJudgeBallotAllocationsForCategory,
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
    requiresSpecialJudge,
    assignedSpecialJudgeUserIds,
  } = (body ?? {}) as {
    action?: "open" | "close" | "finalize";
    name?: string;
    description?: string;
    judgeGuidance?: string;
    votesPerJudge?: number;
    maxVotesPerJudgePerVehicle?: number;
    eligibleEventCategoryIds?: string[];
    assignedJudgeUserIds?: string[];
    requiresSpecialJudge?: boolean;
    assignedSpecialJudgeUserIds?: string[];
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

  const hasFullSettingsPatch =
    judgeGuidance !== undefined ||
    maxVotesPerJudgePerVehicle !== undefined ||
    requiresSpecialJudge !== undefined ||
    assignedJudgeUserIds !== undefined ||
    assignedSpecialJudgeUserIds !== undefined ||
    name !== undefined ||
    description !== undefined ||
    eligibleEventCategoryIds !== undefined;

  if (
    votesPerJudge !== undefined &&
    !hasFullSettingsPatch &&
    (existing.status === "DRAFT" || existing.status === "OPEN")
  ) {
    if (!Number.isInteger(votesPerJudge) || votesPerJudge < 1) {
      return NextResponse.json(
        { error: "votesPerJudge must be a positive integer." },
        { status: 400 },
      );
    }
    const updated = await prisma.judgeBallotCategory.update({
      where: { id: catId },
      data: { votesPerJudge },
      include: {
        eligibleClasses: { select: { eventCategoryId: true } },
        judgeAssignments: { select: { judgeUserId: true } },
        specialJudgeAssignments: { select: { judgeUserId: true } },
      },
    });
    if (existing.status === "OPEN") {
      await syncJudgeBallotAllocationsForCategory(catId);
    }
    return NextResponse.json({ category: updated });
  }

  const canEditStructure = existing.status === "DRAFT";
  const canEditJudges =
    existing.status === "DRAFT" ||
    existing.status === "OPEN" ||
    existing.status === "CLOSED";

  if (!canEditJudges) {
    return NextResponse.json(
      { error: "Finalized categories cannot be edited." },
      { status: 400 },
    );
  }

  if (
    !canEditStructure &&
    (name !== undefined ||
      description !== undefined ||
      eligibleEventCategoryIds !== undefined)
  ) {
    return NextResponse.json(
      {
        error:
          "Only draft categories can change name or vehicle class eligibility.",
      },
      { status: 400 },
    );
  }

  const category = await prisma.$transaction(async (tx) => {
    if (eligibleEventCategoryIds !== undefined && canEditStructure) {
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

    const specialFlag =
      requiresSpecialJudge !== undefined
        ? requiresSpecialJudge
        : undefined;

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

    if (assignedSpecialJudgeUserIds !== undefined) {
      await tx.judgeBallotSpecialJudge.deleteMany({ where: { categoryId: catId } });
      if (assignedSpecialJudgeUserIds.length > 0) {
        await tx.judgeBallotSpecialJudge.createMany({
          data: assignedSpecialJudgeUserIds.map((judgeUserId) => ({
            categoryId: catId,
            judgeUserId,
          })),
        });
      }
    }

    if (specialFlag === true) {
      await tx.judgeBallotCategoryJudge.deleteMany({ where: { categoryId: catId } });
    }
    if (specialFlag === false) {
      await tx.judgeBallotSpecialJudge.deleteMany({ where: { categoryId: catId } });
    }

    const updated = await tx.judgeBallotCategory.update({
      where: { id: catId },
      data: {
        name: canEditStructure && name?.trim() ? name.trim() : undefined,
        description:
          canEditStructure && description !== undefined
            ? description.trim() || null
            : undefined,
        judgeGuidance:
          judgeGuidance !== undefined ? judgeGuidance.trim() || null : undefined,
        votesPerJudge: votesPerJudge !== undefined ? votesPerJudge : undefined,
        maxVotesPerJudgePerVehicle:
          maxVotesPerJudgePerVehicle !== undefined
            ? maxVotesPerJudgePerVehicle
            : undefined,
        requiresSpecialJudge: specialFlag,
      },
      include: {
        eligibleClasses: { select: { eventCategoryId: true } },
        judgeAssignments: { select: { judgeUserId: true } },
        specialJudgeAssignments: { select: { judgeUserId: true } },
      },
    });

    return updated;
  });

  if (existing.status === "OPEN") {
    await syncJudgeBallotAllocationsForCategory(catId);
  }

  return NextResponse.json({ category });
}
