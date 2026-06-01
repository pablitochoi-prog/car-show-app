import { NextResponse } from "next/server";
import { canManageEvent, getCurrentUser } from "@/lib/auth";
import {
  loadEventJudgingTemplate,
  updateEventJudgingTemplateStructure,
} from "@/lib/judging/event-judging-template-service";
import type { TemplateSectionInput } from "@/lib/judging/event-judging-template-validation";

type RouteParams = { params: Promise<{ id: string; templateId: string }> };

export async function PUT(request: Request, { params }: RouteParams) {
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

  const { totalPoints, sections } = (body ?? {}) as {
    totalPoints?: number;
    sections?: TemplateSectionInput[];
  };

  if (!Array.isArray(sections)) {
    return NextResponse.json(
      { error: "sections array is required." },
      { status: 400 },
    );
  }

  try {
    const { warnings } = await updateEventJudgingTemplateStructure({
      eventId,
      templateId,
      totalPoints,
      sections,
    });
    const loaded = await loadEventJudgingTemplate(eventId, templateId);
    return NextResponse.json({ ...loaded, saveWarnings: warnings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed.";
    const status = /locked/i.test(message) ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
