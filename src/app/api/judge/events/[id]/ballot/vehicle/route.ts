import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { normalizeVehicleEntryCode } from "@/lib/vehicle-entry-code";
import { JudgeBallotAccessError } from "@/lib/judging/judge-ballot-judge-data";
import {
  loadVehicleBallotPage,
  saveVehicleBallotVotes,
} from "@/lib/judging/judge-ballot-vehicle-votes";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const url = new URL(request.url);
  const code = normalizeVehicleEntryCode(url.searchParams.get("code") ?? "");
  if (!code) {
    return NextResponse.json(
      { error: "Vehicle entry code is required." },
      { status: 400 },
    );
  }

  try {
    const data = await loadVehicleBallotPage(user.id, eventId, code);
    return NextResponse.json(data);
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
    const message = err instanceof Error ? err.message : "Failed to load ballot.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { vehicleEntryCode, action, selections } = (body ?? {}) as {
    vehicleEntryCode?: string;
    action?: "draft" | "submit";
    selections?: { categoryId: string; starRating: number }[];
  };

  const code = normalizeVehicleEntryCode(vehicleEntryCode ?? "");
  if (!code) {
    return NextResponse.json(
      { error: "vehicleEntryCode is required." },
      { status: 400 },
    );
  }
  if (action !== "draft" && action !== "submit") {
    return NextResponse.json(
      { error: "action must be draft or submit." },
      { status: 400 },
    );
  }
  if (!Array.isArray(selections)) {
    return NextResponse.json(
      { error: "selections must be an array." },
      { status: 400 },
    );
  }

  try {
    const result = await saveVehicleBallotVotes(
      user.id,
      eventId,
      code,
      action,
      selections,
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof JudgeBallotAccessError) {
      const status =
        err.code === "VEHICLE_NOT_FOUND"
          ? 404
          : err.code === "NOT_AUTHORIZED" || err.code === "NOT_JUDGE"
            ? 403
            : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    const message = err instanceof Error ? err.message : "Save failed.";
    const code =
      err instanceof Error && "code" in err
        ? String((err as Error & { code?: string }).code)
        : undefined;
    const status =
      message.includes("not assigned") ||
      message.includes("maximum number of votes")
        ? 400
        : 400;
    return NextResponse.json({ error: message, code }, { status });
  }
}
