import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findVehicleEntryByCode } from "@/lib/vehicle-entry-lookup";
import { normalizeVehicleEntryCode } from "@/lib/vehicle-entry-code";
import { upsertJudgeBallotVote } from "@/lib/judging/upsert-judge-ballot-vote";

type RouteParams = {
  params: Promise<{ id: string; catId: string }>;
};

export async function PUT(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, catId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { vehicleEntryCode, voteCount, notes } = (body ?? {}) as {
    vehicleEntryCode?: string;
    voteCount?: number;
    notes?: string;
  };

  const code = normalizeVehicleEntryCode(vehicleEntryCode ?? "");
  if (!code) {
    return NextResponse.json(
      { error: "vehicleEntryCode is required." },
      { status: 400 },
    );
  }

  if (voteCount === undefined || !Number.isInteger(voteCount) || voteCount < 0) {
    return NextResponse.json(
      { error: "voteCount must be a non-negative integer." },
      { status: 400 },
    );
  }

  const entry = await findVehicleEntryByCode(code);
  if (!entry || entry.eventId !== eventId) {
    return NextResponse.json(
      { error: "Vehicle entry code not found for this event." },
      { status: 404 },
    );
  }

  try {
    const result = await upsertJudgeBallotVote({
      categoryId: catId,
      judgeUserId: user.id,
      vehicleEntryCode: entry.vehicleEntryCode,
      registrationId: entry.registrationId,
      registrationVehicleId: entry.registrationVehicleId,
      vehicleEventCategoryId: entry.eventCategoryId,
      voteCount,
      notes,
    });

    return NextResponse.json({
      vehicleEntryCode: entry.vehicleEntryCode,
      voteCount,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Vote update failed.";
    const code =
      err instanceof Error && "code" in err
        ? String((err as Error & { code?: string }).code)
        : undefined;
    const status =
      message.includes("not assigned") ||
      message.includes("must be assigned as a judge")
        ? 403
        : 400;
    return NextResponse.json({ error: message, code }, { status });
  }
}
