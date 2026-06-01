import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getJudgeScoreSheetDetail,
  judgeScoreSheetAccessErrorResponse,
} from "@/lib/judging/judge-score-sheet-judge-data";
import { saveJudgeScoreSheetDraft } from "@/lib/judging/judge-score-sheet-mutations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string; sheetId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: eventId, sheetId } = await params;
  try {
    const detail = await getJudgeScoreSheetDetail(user.id, eventId, sheetId);
    return NextResponse.json(detail);
  } catch (err) {
    const mapped = judgeScoreSheetAccessErrorResponse(err);
    if (mapped) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET judge score sheet]", err);
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
    items?: Array<{
      itemId?: unknown;
      awardedPoints?: unknown;
      itemNotes?: unknown;
      deductionOptionIds?: unknown;
      deductionComments?: unknown;
    }>;
  };

  try {
    const items = (Array.isArray(payload.items) ? payload.items : []).map((row) => ({
      itemId: typeof row.itemId === "string" ? row.itemId : "",
      awardedPoints:
        row.awardedPoints == null || row.awardedPoints === ""
          ? null
          : Number(row.awardedPoints),
      itemNotes: typeof row.itemNotes === "string" ? row.itemNotes : "",
      deductionOptionIds: Array.isArray(row.deductionOptionIds)
        ? row.deductionOptionIds.filter((id): id is string => typeof id === "string")
        : [],
      deductionComments:
        row.deductionComments && typeof row.deductionComments === "object"
          ? Object.fromEntries(
              Object.entries(row.deductionComments as Record<string, unknown>).map(
                ([k, v]) => [k, typeof v === "string" ? v : ""],
              ),
            )
          : {},
    }));
    const calculated = await saveJudgeScoreSheetDraft({
      judgeUserId: user.id,
      eventId,
      sheetId,
      generalNotes: typeof payload.generalNotes === "string" ? payload.generalNotes : "",
      items,
    });
    return NextResponse.json({ ok: true, calculated });
  } catch (err) {
    const mapped = judgeScoreSheetAccessErrorResponse(err);
    if (mapped) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[PATCH judge score sheet]", err);
    const message = err instanceof Error ? err.message : "Could not save draft.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
