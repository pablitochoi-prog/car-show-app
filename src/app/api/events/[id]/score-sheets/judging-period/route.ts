import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageScoreSheetJudging } from "@/lib/judging/score-sheet-judging-period-auth";
import {
  closeScoreSheetJudgingPeriod,
  finalizeScoreSheetJudgingPeriod,
  loadScoreSheetJudgingPeriod,
  reopenScoreSheetJudgingPeriod,
  ScoreSheetJudgingPeriodError,
} from "@/lib/judging/score-sheet-judging-period";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
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

  const period = await loadScoreSheetJudgingPeriod(eventId);
  if (!period) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  return NextResponse.json({ period });
}

export async function PATCH(request: Request, { params }: RouteParams) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = (body as { action?: string })?.action;

  try {
    if (action === "close") {
      const period = await closeScoreSheetJudgingPeriod(eventId, user.id);
      return NextResponse.json({ period });
    }
    if (action === "finalize") {
      const period = await finalizeScoreSheetJudgingPeriod(eventId, user.id);
      return NextResponse.json({ period });
    }
    if (action === "reopen") {
      const period = await reopenScoreSheetJudgingPeriod(eventId);
      return NextResponse.json({ period });
    }
    return NextResponse.json(
      { error: 'action must be "close", "reopen", or "finalize".' },
      { status: 400 },
    );
  } catch (err) {
    if (err instanceof ScoreSheetJudgingPeriodError) {
      const status =
        err.code === "NOT_FOUND" ? 404 : err.code === "INVALID_STATE" ? 409 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    const message = err instanceof Error ? err.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
