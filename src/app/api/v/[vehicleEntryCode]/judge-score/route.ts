import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserEventRoles } from "@/lib/event-staff";
import { findVehicleEntryByCode } from "@/lib/vehicle-entry-lookup";
import { upsertJudgeScore } from "@/lib/vehicle-judging";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ vehicleEntryCode: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { vehicleEntryCode } = await params;
  const entry = await findVehicleEntryByCode(vehicleEntryCode);
  if (!entry) {
    return NextResponse.json({ error: "Vehicle entry not found." }, { status: 404 });
  }

  const roles = await getUserEventRoles(user.id, entry.eventId);
  if (!roles.includes("JUDGE") && user.platformRole !== "ADMIN") {
    return NextResponse.json(
      { error: "Judge role required for this event." },
      { status: 403 },
    );
  }

  let body: { score?: unknown; notes?: unknown };
  try {
    body = (await request.json()) as { score?: unknown; notes?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const score =
    typeof body.score === "number"
      ? body.score
      : Number.parseInt(String(body.score ?? ""), 10);
  const notes =
    typeof body.notes === "string" ? body.notes.trim() || null : null;

  const result = await upsertJudgeScore(entry, user.id, score, notes);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
