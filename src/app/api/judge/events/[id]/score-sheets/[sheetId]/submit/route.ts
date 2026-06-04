import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  judgeScoreSheetAccessErrorResponse,
  JudgeScoreSheetAccessError,
} from "@/lib/judging/judge-score-sheet-judge-data";
import { submitAssignedScorecard } from "@/lib/judging/judge-assigned-scorecard-mutations";
import type { ScorecardItemDraftInput } from "@/lib/judging/judge-assigned-scorecard-validation";

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

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: eventId, sheetId } = await params;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const payload = (body ?? {}) as {
    generalNotes?: unknown;
    items?: unknown;
    sectionIds?: unknown;
  };

  const sectionIds = Array.isArray(payload.sectionIds)
    ? payload.sectionIds.filter((id): id is string => typeof id === "string")
    : [];

  try {
    const result = await submitAssignedScorecard({
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
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    if (err instanceof JudgeScoreSheetAccessError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    console.error("[POST submit assigned scorecard]", err);
    const message = err instanceof Error ? err.message : "Submit failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
