import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { JudgeScoreSheetAccessError } from "@/lib/judging/judge-score-sheet-judge-data";
import { listJudgeAssignedVehicles } from "@/lib/judging/judge-assigned-scorecard-data";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  try {
    const { eventName, vehicles } = await listJudgeAssignedVehicles(user.id, eventId);
    return NextResponse.json({ event: { id: eventId, name: eventName }, vehicles });
  } catch (err) {
    if (err instanceof JudgeScoreSheetAccessError) {
      const status = err.code === "NOT_JUDGE" ? 403 : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    throw err;
  }
}
