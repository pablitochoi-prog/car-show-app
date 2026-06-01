import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  JudgeBallotAccessError,
  loadJudgeBallotCategoryDetail,
} from "@/lib/judging/judge-ballot-judge-data";

type RouteParams = { params: Promise<{ id: string; catId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, catId } = await params;

  try {
    const detail = await loadJudgeBallotCategoryDetail(
      user.id,
      eventId,
      catId,
    );
    return NextResponse.json(detail);
  } catch (err) {
    if (err instanceof JudgeBallotAccessError) {
      const status = err.code === "NOT_FOUND" ? 404 : 403;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    throw err;
  }
}
