import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canManageScoreSheetJudging } from "@/lib/judging/score-sheet-judging-period-auth";
import {
  buildJudgeScoreSheetMatrixCsv,
  judgeScoreSheetMatrixCsvFilename,
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
  const judgeUserId = url.searchParams.get("judgeUserId")?.trim();
  if (!judgingClassId || !judgeUserId) {
    return NextResponse.json(
      {
        error: "judgingClassId and judgeUserId query parameters are required.",
      },
      { status: 400 },
    );
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { name: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const matrix = await loadOrganizerJudgeScoreSheetMatrix(
    eventId,
    judgeUserId,
    judgingClassId,
  );
  if (!matrix) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const csv = buildJudgeScoreSheetMatrixCsv({
    eventName: event.name,
    matrix,
  });

  const filename = judgeScoreSheetMatrixCsvFilename({
    eventId,
    judgeName: matrix.judge.name,
    className: matrix.judgingClass.name,
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
