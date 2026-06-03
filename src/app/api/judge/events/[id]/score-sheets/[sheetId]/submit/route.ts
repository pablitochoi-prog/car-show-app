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
    return {
      itemId: typeof r.itemId === "string" ? r.itemId : "",
      discretionaryPoints:
        r.discretionaryPoints == null || r.discretionaryPoints === ""
          ? null
          : Number(r.discretionaryPoints),
      levelSelections: Array.isArray(r.levelSelections)
        ? r.levelSelections
            .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
            .map((x) => ({
              optionId: typeof x.optionId === "string" ? x.optionId : "",
              violationCount:
                x.violationCount == null ? undefined : Number(x.violationCount),
            }))
            .filter((x) => x.optionId)
        : [],
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

  const payload = (body ?? {}) as { generalNotes?: unknown; items?: unknown };

  try {
    const detail = await submitAssignedScorecard({
      judgeUserId: user.id,
      eventId,
      sheetId,
      generalNotes: typeof payload.generalNotes === "string" ? payload.generalNotes : "",
      items: parseItems(payload.items),
    });
    return NextResponse.json({ ok: true, detail });
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
