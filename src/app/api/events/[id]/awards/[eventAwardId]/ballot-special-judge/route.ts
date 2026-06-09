import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { getEventStaffList } from "@/lib/event-staff";
import { updateEventAwardBallotSpecialJudge } from "@/lib/judging/event-award-ballot-link";

/** Return the set of userIds that hold the special_judge role on this event. */
async function getSpecialJudgeUserIds(eventId: string): Promise<Set<string>> {
  const links = await prisma.eventStaffRoleLink.findMany({
    where: {
      staffMember: { eventId },
      role: { slug: "special_judge" },
    },
    include: { staffMember: { select: { userId: true } } },
  });
  return new Set(links.map((l) => l.staffMember.userId));
}

type RouteParams = { params: Promise<{ id: string; eventAwardId: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, eventAwardId } = await params;
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { requiresSpecialJudge, assignedSpecialJudgeUserIds } = (body ?? {}) as {
    requiresSpecialJudge?: boolean;
    assignedSpecialJudgeUserIds?: string[];
  };

  if (typeof requiresSpecialJudge !== "boolean") {
    return NextResponse.json(
      { error: "requiresSpecialJudge must be a boolean." },
      { status: 400 },
    );
  }

  const judgeIds = Array.isArray(assignedSpecialJudgeUserIds)
    ? assignedSpecialJudgeUserIds.filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      )
    : [];

  if (requiresSpecialJudge && judgeIds.length === 0) {
    const specialJudgeCount = (
      await getEventStaffList(eventId)
    ).filter((m) => m.roles.some((r) => r.slug === "special_judge")).length;

    if (specialJudgeCount === 0) {
      return NextResponse.json(
        {
          error:
            'Before you can designate that an award is selected by a special judge, you must add a person to the event staff with the role of "Special Judge".',
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          "Select at least one Special Judge when Special Judge designation is enabled.",
      },
      { status: 400 },
    );
  }

  if (requiresSpecialJudge && judgeIds.length > 0) {
    // Validate that every supplied id actually holds the special_judge role on
    // this event. Rejects arbitrary user ids that are not event staff.
    const validIds = await getSpecialJudgeUserIds(eventId);
    const invalid = judgeIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      return NextResponse.json(
        {
          error:
            "One or more selected users do not have the Special Judge role for this event.",
        },
        { status: 400 },
      );
    }
  }

  try {
    const config = await updateEventAwardBallotSpecialJudge(
      eventId,
      eventAwardId,
      {
        requiresSpecialJudge,
        assignedSpecialJudgeUserIds: judgeIds,
      },
    );
    return NextResponse.json({ config });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not update ballot settings.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
