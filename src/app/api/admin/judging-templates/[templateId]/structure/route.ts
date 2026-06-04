import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import {
  loadGlobalJudgingTemplate,
  updateGlobalJudgingTemplateStructure,
} from "@/lib/judging/global-judging-template-service";
import type { TemplateSectionInput } from "@/lib/judging/event-judging-template-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ templateId: string }> };

export async function PUT(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { templateId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { totalPoints, sections, scoringGroup, vehicleType, methodology } =
    (body ?? {}) as {
      totalPoints?: number;
      sections?: TemplateSectionInput[];
      scoringGroup?: string | null;
      vehicleType?: string | null;
      methodology?: "DEDUCTION" | "ADDITIVE" | "ORIGINALITY_CONDITION";
    };

  if (!Array.isArray(sections)) {
    return NextResponse.json(
      { error: "sections array is required." },
      { status: 400 },
    );
  }

  try {
    const { warnings } = await updateGlobalJudgingTemplateStructure({
      templateId,
      totalPoints,
      scoringGroup,
      vehicleType,
      methodology,
      sections,
    });
    const loaded = await loadGlobalJudgingTemplate(templateId);
    return NextResponse.json({ ...loaded, saveWarnings: warnings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
