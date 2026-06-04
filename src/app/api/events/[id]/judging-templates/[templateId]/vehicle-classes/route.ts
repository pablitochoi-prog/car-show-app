import { NextResponse } from "next/server";
import { canManageEvent, getCurrentUser } from "@/lib/auth";
import {
  listEventJudgingTemplatesForOrganizer,
  setTemplateEligibleVehicleClasses,
} from "@/lib/judging/event-judging-template-setup";

type RouteParams = { params: Promise<{ id: string; templateId: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, templateId } = await params;
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

  const { eligibleEventCategoryIds } = (body ?? {}) as {
    eligibleEventCategoryIds?: string[];
  };
  if (!Array.isArray(eligibleEventCategoryIds)) {
    return NextResponse.json(
      { error: "eligibleEventCategoryIds array is required." },
      { status: 400 },
    );
  }

  try {
    await setTemplateEligibleVehicleClasses(
      eventId,
      templateId,
      eligibleEventCategoryIds,
    );
    const templates = await listEventJudgingTemplatesForOrganizer(eventId);
    return NextResponse.json({ templates });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
