import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import {
  loadGlobalJudgingTemplate,
  updateGlobalJudgingTemplateMetadata,
  updateGlobalJudgingTemplateStructure,
} from "@/lib/judging/global-judging-template-service";
import { readScoringTemplateExcelUpload } from "@/lib/judging/scoring-template-excel-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ templateId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { templateId } = await params;
  const existing = await loadGlobalJudgingTemplate(templateId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const upload = await readScoringTemplateExcelUpload(request);
  if (!upload.ok) return upload.response;

  const { meta, sections } = upload.data;

  try {
    await updateGlobalJudgingTemplateMetadata({
      templateId,
      name: meta.name,
      description: meta.description,
      totalPoints: meta.totalPoints,
      scoringGroup: meta.scoringGroup,
      vehicleType: meta.vehicleType,
      methodology: meta.methodology,
    });
    const { warnings } = await updateGlobalJudgingTemplateStructure({
      templateId,
      totalPoints: meta.totalPoints,
      scoringGroup: meta.scoringGroup,
      vehicleType: meta.vehicleType,
      methodology: meta.methodology,
      sections,
    });
    const loaded = await loadGlobalJudgingTemplate(templateId);
    return NextResponse.json({ ...loaded, saveWarnings: warnings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
