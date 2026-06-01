import { NextResponse } from "next/server";
import { canManageEvent, getCurrentUser } from "@/lib/auth";
import {
  loadEventJudgingTemplate,
  updateEventJudgingTemplateGuidance,
} from "@/lib/judging/event-judging-template-service";

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

  const { sections } = (body ?? {}) as {
    sections?: {
      id: string;
      judgeGuidance?: string | null;
      items: { id: string; judgeGuidance?: string | null }[];
    }[];
  };

  if (!Array.isArray(sections)) {
    return NextResponse.json(
      { error: "sections array is required." },
      { status: 400 },
    );
  }

  try {
    await updateEventJudgingTemplateGuidance({
      eventId,
      templateId,
      sections,
    });
    const loaded = await loadEventJudgingTemplate(eventId, templateId);
    return NextResponse.json(loaded);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
