import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageScoreSheetJudging } from "@/lib/judging/score-sheet-judging-period-auth";
import {
  listJudgesWithSubmittedScoreSheets,
  loadOrganizerJudgeScoreSheetMatrix,
} from "@/lib/judging/organizer-judge-score-sheet-matrix";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const allowed = await canManageScoreSheetJudging(
    user.id,
    eventId,
    user.platformRole,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const judgingClassId = url.searchParams.get("judgingClassId")?.trim();
  if (!judgingClassId) {
    return NextResponse.json(
      { error: "judgingClassId query parameter is required." },
      { status: 400 },
    );
  }

  try {
    const judgeUserId = url.searchParams.get("judgeUserId")?.trim();
    if (!judgeUserId) {
      const judges = await listJudgesWithSubmittedScoreSheets(
        eventId,
        judgingClassId,
      );
      return NextResponse.json({ judges });
    }

    const matrix = await loadOrganizerJudgeScoreSheetMatrix(
      eventId,
      judgeUserId,
      judgingClassId,
    );
    if (!matrix) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    return NextResponse.json(matrix);
  } catch (error) {
    console.error("judge-matrix load failed", error);
    return NextResponse.json(
      { error: "Failed to load judge score sheet matrix." },
      { status: 500 },
    );
  }
}
