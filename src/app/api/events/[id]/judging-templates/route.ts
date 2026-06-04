import { NextResponse } from "next/server";
import { canManageEvent, getCurrentUser } from "@/lib/auth";
import { listEventJudgingTemplatesForOrganizer } from "@/lib/judging/event-judging-template-setup";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
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

  const templates = await listEventJudgingTemplatesForOrganizer(eventId);
  return NextResponse.json({ templates });
}
