import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageVehicleRegistrations } from "@/lib/vehicle-registrations-auth";
import {
  assertEventHasScorecardTemplate,
  assignJudgeToVehicleCategories,
  EventJudgeAssignmentError,
  listAssignmentVehicleClasses,
  listEventAssigneeJudges,
  listEventScorecardCategoriesForEvent,
  listEventScorecardCategoriesForVehicleClass,
  listScorecardCategoriesForSelectedVehicles,
  listVehiclesForAssignment,
} from "@/lib/judging/event-judge-category-assignment";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const allowed = await canManageVehicleRegistrations(
    user.id,
    eventId,
    user.platformRole,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const eventCategoryId = url.searchParams.get("eventCategoryId")?.trim() || null;
  const registrationVehicleIds = url.searchParams
    .get("registrationVehicleIds")
    ?.split(",")
    .map((id) => id.trim())
    .filter(Boolean) ?? [];

  let templateWarning: string | null = null;
  try {
    await assertEventHasScorecardTemplate(eventId);
  } catch (err) {
    if (
      err instanceof EventJudgeAssignmentError &&
      err.code === "NO_TEMPLATE"
    ) {
      templateWarning = err.message;
    } else if (err instanceof EventJudgeAssignmentError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    } else {
      throw err;
    }
  }

  try {
    const judges = await listEventAssigneeJudges(eventId);

    const vehicleClasses = await listAssignmentVehicleClasses(eventId);

    let scorecardCategories = null;
    let vehicles = null;
    if (registrationVehicleIds.length > 0) {
      scorecardCategories = await listScorecardCategoriesForSelectedVehicles(
        eventId,
        registrationVehicleIds,
      );
    } else if (eventCategoryId) {
      scorecardCategories = await listEventScorecardCategoriesForVehicleClass(
        eventId,
        eventCategoryId,
      );
      vehicles = await listVehiclesForAssignment(eventId, eventCategoryId);
    } else {
      scorecardCategories = await listEventScorecardCategoriesForEvent(eventId);
    }

    return NextResponse.json({
      judges,
      vehicleClasses,
      scorecardCategories,
      vehicles,
      templateWarning,
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
  const allowed = await canManageVehicleRegistrations(
    user.id,
    eventId,
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
