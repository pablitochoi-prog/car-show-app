import { NextResponse } from "next/server";
import { canManageEvent, getCurrentUser } from "@/lib/auth";
import {
  listEventJudgingTemplatesForOrganizer,
  reorderEventJudgingTemplates,
} from "@/lib/judging/event-judging-template-setup";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
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

  const { orderedTemplateIds } = (body ?? {}) as { orderedTemplateIds?: string[] };
  if (!Array.isArray(orderedTemplateIds) || orderedTemplateIds.length === 0) {
    return NextResponse.json(
      { error: "orderedTemplateIds is required." },
      { status: 400 },
    );
  }

  try {
    await reorderEventJudgingTemplates(eventId, orderedTemplateIds);
    const templates = await listEventJudgingTemplatesForOrganizer(eventId);
    return NextResponse.json({ templates });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reorder failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
