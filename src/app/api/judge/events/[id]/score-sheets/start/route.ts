import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  JudgeScoreSheetAccessError,
  startOrResumeJudgeScoreSheet,
} from "@/lib/judging/judge-score-sheet-judge-data";
import { normalizeVehicleEntryCode } from "@/lib/vehicle-entry-code";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: eventId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { classId, vehicleEntryCode } = (body ?? {}) as {
    classId?: string;
    vehicleEntryCode?: string;
  };

  if (!classId?.trim()) {
    return NextResponse.json(
      { error: "classId is required." },
      { status: 400 },
    );
  }
  const code = normalizeVehicleEntryCode(vehicleEntryCode ?? "");
  if (!code) {
    return NextResponse.json(
      { error: "vehicleEntryCode is required." },
      { status: 400 },
    );
  }

  try {
    const result = await startOrResumeJudgeScoreSheet({
      judgeUserId: user.id,
      eventId,
      classId: classId.trim(),
      vehicleEntryCode: code,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof JudgeScoreSheetAccessError) {
      const status =
        err.code === "NOT_JUDGE"
          ? 403
          : err.code === "VEHICLE_NOT_FOUND" || err.code === "CLASS_NOT_FOUND"
            ? 404
            : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    throw err;
  }
}
