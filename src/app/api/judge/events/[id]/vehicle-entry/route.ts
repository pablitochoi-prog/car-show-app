import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { normalizeVehicleEntryCode } from "@/lib/vehicle-entry-code";
import {
  JudgeBallotAccessError,
  previewJudgeVehicleEntry,
} from "@/lib/judging/judge-ballot-judge-data";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const url = new URL(request.url);
  const rawCode = url.searchParams.get("code") ?? "";
  const categoryId = url.searchParams.get("categoryId")?.trim() || undefined;

  const code = normalizeVehicleEntryCode(rawCode);
  if (!code) {
    return NextResponse.json(
      { error: "Enter a valid vehicle entry code." },
      { status: 400 },
    );
  }

  try {
    const preview = await previewJudgeVehicleEntry(
      user.id,
      eventId,
      code,
      categoryId,
    );
    return NextResponse.json({ preview });
  } catch (err) {
    if (err instanceof JudgeBallotAccessError) {
      const status =
        err.code === "VEHICLE_NOT_FOUND"
          ? 404
          : err.code === "NOT_JUDGE"
            ? 403
            : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    throw err;
  }
}
