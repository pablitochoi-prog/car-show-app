import { NextResponse } from "next/server";
import { canManageEvent, getCurrentUser } from "@/lib/auth";
import { loadEventJudgingTemplate } from "@/lib/judging/event-judging-template-service";
import { buildScoringTemplateExcelResponse } from "@/lib/judging/scoring-template-excel-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  return buildScoringTemplateExcelResponse(loaded.template);
}
