import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { judgeScoreSheetAccessErrorResponse } from "@/lib/judging/judge-score-sheet-judge-data";
import { submitJudgeScoreSheet } from "@/lib/judging/judge-score-sheet-mutations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string; sheetId: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: eventId, sheetId } = await params;

  try {
    const calculated = await submitJudgeScoreSheet({
      judgeUserId: user.id,
      eventId,
      sheetId,
    });
    return NextResponse.json({ ok: true, calculated });
  } catch (err) {
    const mapped = judgeScoreSheetAccessErrorResponse(err);
    if (mapped) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[POST judge score sheet submit]", err);
    const message = err instanceof Error ? err.message : "Could not submit score sheet.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
