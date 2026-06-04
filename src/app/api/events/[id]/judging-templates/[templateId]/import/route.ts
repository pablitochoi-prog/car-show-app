import { NextResponse } from "next/server";
import { canManageEvent, getCurrentUser } from "@/lib/auth";
import {
  loadEventJudgingTemplate,
  updateEventJudgingTemplateMetadata,
  updateEventJudgingTemplateStructure,
} from "@/lib/judging/event-judging-template-service";
import { readScoringTemplateExcelUpload } from "@/lib/judging/scoring-template-excel-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string; templateId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
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

  const existing = await loadEventJudgingTemplate(eventId, templateId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!existing.editLockInfo.canEditStructure) {
    return NextResponse.json(
      {
        error:
          "Structural edits are locked because submitted or finalized score sheets exist.",
      },
      { status: 409 },
    );
  }

  const upload = await readScoringTemplateExcelUpload(request);
  if (!upload.ok) return upload.response;

  const { meta, sections } = upload.data;

  try {
    await updateEventJudgingTemplateMetadata({
      eventId,
      templateId,
      name: meta.name,
      description: meta.description,
      totalPoints: meta.totalPoints,
      scoringGroup: meta.scoringGroup,
      vehicleType: meta.vehicleType,
      methodology: meta.methodology,
    });
    const { warnings } = await updateEventJudgingTemplateStructure({
      eventId,
      templateId,
      totalPoints: meta.totalPoints,
      scoringGroup: meta.scoringGroup,
      vehicleType: meta.vehicleType,
      methodology: meta.methodology,
      sections,
    });
    const loaded = await loadEventJudgingTemplate(eventId, templateId);
    return NextResponse.json({ ...loaded, saveWarnings: warnings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed.";
    const status = /locked/i.test(message) ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
