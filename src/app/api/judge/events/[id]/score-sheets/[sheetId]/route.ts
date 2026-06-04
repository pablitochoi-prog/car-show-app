import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  judgeScoreSheetAccessErrorResponse,
  JudgeScoreSheetAccessError,
} from "@/lib/judging/judge-score-sheet-judge-data";
import { loadJudgeAssignedScorecardDetail } from "@/lib/judging/judge-assigned-scorecard-data";
import { saveAssignedScorecardDraft } from "@/lib/judging/judge-assigned-scorecard-mutations";
import type { ScorecardItemDraftInput } from "@/lib/judging/judge-assigned-scorecard-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string; sheetId: string }> };

function parseItems(raw: unknown): ScorecardItemDraftInput[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = (row ?? {}) as Record<string, unknown>;
    const levelSelections = Array.isArray(r.levelSelections)
      ? r.levelSelections
          .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
          .map((x) => ({
            optionId: typeof x.optionId === "string" ? x.optionId : "",
            violationCount:
              x.violationCount == null ? undefined : Number(x.violationCount),
          }))
          .filter((x) => x.optionId)
      : [];
    const legacyOptionIds = Array.isArray(r.deductionOptionIds)
      ? r.deductionOptionIds.filter((id): id is string => typeof id === "string")
      : [];
    const mergedSelections =
      levelSelections.length > 0
        ? levelSelections
        : legacyOptionIds.map((optionId) => ({ optionId, violationCount: undefined }));

    return {
      itemId: typeof r.itemId === "string" ? r.itemId : "",
      discretionaryPoints:
        r.discretionaryPoints == null || r.discretionaryPoints === ""
          ? null
          : Number(r.discretionaryPoints),
      levelSelections: mergedSelections,
      itemNotes: typeof r.itemNotes === "string" ? r.itemNotes : "",
      deductionComments:
        r.deductionComments && typeof r.deductionComments === "object"
          ? Object.fromEntries(
              Object.entries(r.deductionComments as Record<string, unknown>).map(
                ([k, v]) => [k, typeof v === "string" ? v : ""],
              ),
            )
          : {},
    };
  });
}

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: eventId, sheetId } = await params;
  try {
    const detail = await loadJudgeAssignedScorecardDetail(user.id, eventId, sheetId);
    return NextResponse.json(detail);
  } catch (err) {
    const mapped = judgeScoreSheetAccessErrorResponse(err);
    if (mapped) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET judge assigned scorecard]", err);
    const message = err instanceof Error ? err.message : "Failed to load score sheet.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: eventId, sheetId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = (body ?? {}) as {
    generalNotes?: unknown;
    sectionIds?: unknown;
    items?: unknown;
  };

  const sectionIds = Array.isArray(payload.sectionIds)
    ? payload.sectionIds.filter((id): id is string => typeof id === "string")
    : [];

  if (sectionIds.length === 0) {
    return NextResponse.json(
      { error: "sectionIds must include at least one category." },
      { status: 400 },
    );
  }

  try {
    const result = await saveAssignedScorecardDraft({
      judgeUserId: user.id,
      eventId,
      sheetId,
      generalNotes: typeof payload.generalNotes === "string" ? payload.generalNotes : "",
      sectionIds,
      items: parseItems(payload.items),
    });
    return NextResponse.json(result);
  } catch (err) {
    const mapped = judgeScoreSheetAccessErrorResponse(err);
    if (mapped) {
      console.error(
        "[PATCH judge assigned scorecard]",
        mapped.body.code,
        mapped.body.error,
      );
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    if (err instanceof JudgeScoreSheetAccessError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    console.error("[PATCH judge assigned scorecard]", err);
    const message = err instanceof Error ? err.message : "Could not save draft.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
