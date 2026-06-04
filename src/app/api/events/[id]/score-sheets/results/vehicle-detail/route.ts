import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageScoreSheetJudging } from "@/lib/judging/score-sheet-judging-period-auth";
import { loadOrganizerVehicleScoreSheetDetail } from "@/lib/judging/organizer-score-sheet-vehicle-detail";

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
  const vehicleEntryCode = url.searchParams.get("vehicleEntryCode")?.trim();
  if (!judgingClassId || !vehicleEntryCode) {
    return NextResponse.json(
      {
        error:
          "judgingClassId and vehicleEntryCode query parameters are required.",
      },
      { status: 400 },
    );
  }

  const includeDrafts = url.searchParams.get("includeDrafts") === "1";
  const detail = await loadOrganizerVehicleScoreSheetDetail(
    eventId,
    judgingClassId,
    vehicleEntryCode,
    { includeDrafts },
  );
  if (!detail) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json(detail);
}
