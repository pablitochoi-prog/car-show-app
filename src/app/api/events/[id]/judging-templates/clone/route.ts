import { NextResponse } from "next/server";
import { canManageEvent, getCurrentUser } from "@/lib/auth";
import { cloneJudgingTemplateToEvent } from "@/lib/judging/clone-judging-template-to-event";

type RouteParams = { params: Promise<{ id: string }> };

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

  const { sourceTemplateId, name } = (body ?? {}) as {
    sourceTemplateId?: string;
    name?: string;
  };

  if (!sourceTemplateId?.trim()) {
    return NextResponse.json(
      { error: "sourceTemplateId is required." },
      { status: 400 },
    );
  }

  try {
    const result = await cloneJudgingTemplateToEvent({
      eventId,
      sourceTemplateId: sourceTemplateId.trim(),
      name,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Clone failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
