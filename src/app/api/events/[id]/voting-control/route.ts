import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageScoreSheetJudging } from "@/lib/judging/score-sheet-judging-period-auth";
import {
  closeAllEventVoting,
  EventVotingControlError,
  finalizeAllEventVoting,
  loadEventVotingControl,
  openAllEventVoting,
  reopenAllEventVoting,
  unfinalizeAllEventVoting,
} from "@/lib/judging/event-voting-control";
import { ScoreSheetJudgingPeriodError } from "@/lib/judging/score-sheet-judging-period";

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

  try {
    const snapshot = await loadEventVotingControl(eventId);
    if (!snapshot) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }
    return NextResponse.json({ snapshot });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
    let snapshot;
    if (action === "close_all") {
      snapshot = await closeAllEventVoting(eventId, user.id);
    } else if (action === "open_all") {
      snapshot = await openAllEventVoting(eventId);
    } else if (action === "reopen_all") {
      snapshot = await reopenAllEventVoting(eventId);
    } else if (action === "finalize_all") {
      snapshot = await finalizeAllEventVoting(eventId, user.id);
    } else if (action === "unfinalize_all") {
      if (user.platformRole !== "ADMIN") {
        return NextResponse.json(
          { error: "Only site administrators can un-finalize results." },
          { status: 403 },
        );
      }
      snapshot = await unfinalizeAllEventVoting(eventId);
    } else {
      return NextResponse.json(
        {
          error:
            'action must be "close_all", "open_all", "reopen_all", "finalize_all", or "unfinalize_all".',
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ snapshot });
  } catch (err) {
    if (err instanceof EventVotingControlError) {
      const status = err.code === "NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: err.message }, { status });
    }
    if (err instanceof ScoreSheetJudgingPeriodError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
