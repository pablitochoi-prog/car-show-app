import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageScoreSheetJudging } from "@/lib/judging/score-sheet-judging-period-auth";
import { aggregateScoreSheetResults } from "@/lib/judging/score-sheet-results";

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

  const results = await aggregateScoreSheetResults(eventId, judgingClassId, {
    includeOwnerNames: true,
  });
  if (!results) {
    return NextResponse.json({ error: "Judging class not found." }, { status: 404 });
  }

  return NextResponse.json(results);
}
