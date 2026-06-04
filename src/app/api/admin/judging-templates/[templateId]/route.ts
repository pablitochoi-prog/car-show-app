import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import {
  deleteGlobalJudgingTemplate,
  loadGlobalJudgingTemplate,
  setGlobalJudgingTemplateActive,
  updateGlobalJudgingTemplateMetadata,
} from "@/lib/judging/global-judging-template-service";

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

  return NextResponse.json(loaded);
}

export async function PATCH(request: Request, { params }: RouteParams) {
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

  const { name, description, totalPoints, scoringGroup, vehicleType, methodology, isActive } =
    (body ?? {}) as {
      name?: string;
      description?: string | null;
      totalPoints?: number;
      scoringGroup?: string | null;
      vehicleType?: string | null;
      methodology?: "DEDUCTION" | "ADDITIVE" | "ORIGINALITY_CONDITION";
      isActive?: boolean;
    };

  try {
    if (typeof isActive === "boolean") {
      await setGlobalJudgingTemplateActive(templateId, isActive);
    }
    const hasMetadata =
      name != null ||
      description !== undefined ||
      totalPoints != null ||
      scoringGroup !== undefined ||
      vehicleType !== undefined ||
      methodology != null;
    if (hasMetadata) {
      await updateGlobalJudgingTemplateMetadata({
        templateId,
        name,
        description,
        totalPoints,
        scoringGroup,
        vehicleType,
        methodology,
      });
    }
    const loaded = await loadGlobalJudgingTemplate(templateId);
    return NextResponse.json(loaded);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { templateId } = await params;

  try {
    const deleted = await deleteGlobalJudgingTemplate(templateId);
    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed.";
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
