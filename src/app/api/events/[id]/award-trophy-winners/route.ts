import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageScoreSheetJudging } from "@/lib/judging/score-sheet-judging-period-auth";
import {
  AwardTrophyPlacementError,
  loadAwardTrophyWinners,
  upsertAwardTrophyPlacement,
} from "@/lib/judging/award-trophy-winners";

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
    const payload = await loadAwardTrophyWinners(eventId);
    if (!payload) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load.";
    const isMigration =
      message.includes("event_trophy_placements") ||
      message.includes("EventTrophyPlacement");
    return NextResponse.json(
      {
        error: isMigration
          ? "Trophy winners database table is missing. Run database migrations (npm run db:migrate:deploy)."
          : message,
      },
      { status: 500 },
    );
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

  const trophyEntryId = (body as { trophyEntryId?: string })?.trophyEntryId?.trim();
  if (!trophyEntryId) {
    return NextResponse.json({ error: "trophyEntryId is required." }, { status: 400 });
  }

  try {
    await upsertAwardTrophyPlacement(eventId, {
      trophyEntryId,
      vehicleEntryCode: (body as { vehicleEntryCode?: string | null })
        .vehicleEntryCode,
      isVacant: (body as { isVacant?: boolean }).isVacant,
      clearSelection: (body as { clearSelection?: boolean }).clearSelection,
      excludeWinner: (body as { excludeWinner?: boolean }).excludeWinner,
    });
    const payload = await loadAwardTrophyWinners(eventId);
    return NextResponse.json(payload);
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes("event_trophy_placements") ||
        err.message.includes("EventTrophyPlacement"))
    ) {
      return NextResponse.json(
        {
          error:
            "Trophy winners database table is missing. Run database migrations (npm run db:migrate:deploy).",
        },
        { status: 500 },
      );
    }
    if (err instanceof AwardTrophyPlacementError) {
      const status =
        err.code === "NOT_FOUND"
          ? 404
          : err.code === "NOT_FINALIZED"
            ? 409
            : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    const message = err instanceof Error ? err.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
