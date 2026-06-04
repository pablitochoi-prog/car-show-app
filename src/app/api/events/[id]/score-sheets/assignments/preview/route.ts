import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageVehicleRegistrations } from "@/lib/vehicle-registrations-auth";
import {
  EventJudgeAssignmentError,
  previewJudgeCategoryAssignmentConflicts,
} from "@/lib/judging/event-judge-category-assignment";

type RouteParams = { params: Promise<{ id: string }> };

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

  const { judgeUserId, registrationVehicleIds, eventJudgingSectionIds } = (body ?? {}) as {
    judgeUserId?: string;
    registrationVehicleIds?: string[];
    eventJudgingSectionIds?: string[];
  };

  if (!judgeUserId?.trim()) {
    return NextResponse.json({ error: "judgeUserId is required." }, { status: 400 });
  }

  try {
    const conflicts = await previewJudgeCategoryAssignmentConflicts({
      eventId,
      judgeUserId: judgeUserId.trim(),
      registrationVehicleIds: Array.isArray(registrationVehicleIds)
        ? registrationVehicleIds
        : [],
      eventJudgingSectionIds: Array.isArray(eventJudgingSectionIds)
        ? eventJudgingSectionIds
        : [],
    });
    return NextResponse.json({ conflicts });
  } catch (err) {
    if (err instanceof EventJudgeAssignmentError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Preview failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
