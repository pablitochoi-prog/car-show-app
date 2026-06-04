import { NextResponse } from "next/server";
import { canManageEvent, getCurrentUser } from "@/lib/auth";
import {
  deleteEventJudgingTemplate,
  listEventJudgingTemplatesForOrganizer,
} from "@/lib/judging/event-judging-template-setup";
import {
  loadEventJudgingTemplate,
  updateEventJudgingTemplateMetadata,
} from "@/lib/judging/event-judging-template-service";

type RouteParams = { params: Promise<{ id: string; templateId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
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

  const loaded = await loadEventJudgingTemplate(eventId, templateId);
  if (!loaded) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(loaded);
}

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

  const { name, description, totalPoints, scoringGroup, vehicleType, methodology } =
    (body ?? {}) as {
      name?: string;
      description?: string | null;
      totalPoints?: number;
      scoringGroup?: string | null;
      vehicleType?: string | null;
      methodology?: "DEDUCTION" | "ADDITIVE" | "ORIGINALITY_CONDITION";
    };

  try {
    const template = await updateEventJudgingTemplateMetadata({
      eventId,
      templateId,
      name,
      description,
      totalPoints,
      scoringGroup,
      vehicleType,
      methodology,
    });
    const loaded = await loadEventJudgingTemplate(eventId, template.id);
    return NextResponse.json(loaded);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
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

  try {
    const result = await deleteEventJudgingTemplate(eventId, templateId);
    const templates = await listEventJudgingTemplatesForOrganizer(eventId);
    return NextResponse.json({ ...result, templates });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
