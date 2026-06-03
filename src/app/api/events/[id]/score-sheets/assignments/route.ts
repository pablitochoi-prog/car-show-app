import { NextResponse } from "next/server";
import { canManageEvent, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  assertEventHasScorecardTemplate,
  assignJudgeToVehicleCategories,
  EventJudgeAssignmentError,
  listEventAssigneeJudges,
  listEventScorecardCategoriesForVehicleClass,
  listVehiclesForAssignment,
} from "@/lib/judging/event-judge-category-assignment";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
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

  const url = new URL(request.url);
  const eventCategoryId = url.searchParams.get("eventCategoryId")?.trim() || null;

  try {
    await assertEventHasScorecardTemplate(eventId);

    const judges = await listEventAssigneeJudges(eventId);

    const vehicleClassesRaw = await prisma.eventCategory.findMany({
      where: {
        eventId,
        judgingClassEligible: { eventJudgingClass: { isActive: true } },
      },
      select: {
        id: true,
        customName: true,
        category: { select: { name: true, sortOrder: true } },
      },
      orderBy: [{ createdAt: "asc" }],
    });
    const vehicleClasses = vehicleClassesRaw
      .map((c) => ({
        id: c.id,
        name: c.customName?.trim() || c.category?.name || "Vehicle class",
        sortOrder: c.category?.sortOrder ?? 0,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

    let scorecardCategories = null;
    let vehicles = null;
    if (eventCategoryId) {
      scorecardCategories = await listEventScorecardCategoriesForVehicleClass(
        eventId,
        eventCategoryId,
      );
      vehicles = await listVehiclesForAssignment(eventId, eventCategoryId);
    }

    return NextResponse.json({
      judges,
      vehicleClasses,
      scorecardCategories,
      vehicles,
    });
  } catch (err) {
    if (err instanceof EventJudgeAssignmentError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Failed to load assignments.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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

  const {
    judgeUserId,
    registrationVehicleIds,
    eventJudgingSectionIds,
    replaceExisting,
  } = (body ?? {}) as {
    judgeUserId?: string;
    registrationVehicleIds?: string[];
    eventJudgingSectionIds?: string[];
    replaceExisting?: boolean;
  };

  if (!judgeUserId?.trim()) {
    return NextResponse.json({ error: "judgeUserId is required." }, { status: 400 });
  }
  if (!Array.isArray(registrationVehicleIds) || registrationVehicleIds.length === 0) {
    return NextResponse.json(
      { error: "registrationVehicleIds must be a non-empty array." },
      { status: 400 },
    );
  }
  if (!Array.isArray(eventJudgingSectionIds) || eventJudgingSectionIds.length === 0) {
    return NextResponse.json(
      { error: "eventJudgingSectionIds must be a non-empty array." },
      { status: 400 },
    );
  }

  try {
    await assertEventHasScorecardTemplate(eventId);
    const result = await assignJudgeToVehicleCategories({
      eventId,
      assignedByUserId: user.id,
      judgeUserId: judgeUserId.trim(),
      registrationVehicleIds,
      eventJudgingSectionIds,
      replaceExisting: replaceExisting === true,
    });
    return NextResponse.json({ ok: true, summary: result });
  } catch (err) {
    if (err instanceof EventJudgeAssignmentError) {
      const status = err.code === "CONFLICTS" ? 409 : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    const message = err instanceof Error ? err.message : "Assignment failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
