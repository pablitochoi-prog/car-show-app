import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import { loadGlobalJudgingTemplate } from "@/lib/judging/global-judging-template-service";
import { buildScoringTemplateExcelResponse } from "@/lib/judging/scoring-template-excel-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ templateId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { templateId } = await params;
  const loaded = await loadGlobalJudgingTemplate(templateId);
  if (!loaded) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return buildScoringTemplateExcelResponse(loaded.template);
}
