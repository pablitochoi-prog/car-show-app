import { NextResponse } from "next/server";
import { getCurrentUser, writeAccessDeniedResponse } from "@/lib/auth";
import {
  deleteVehicleManualAward,
  updateVehicleManualAward,
} from "@/lib/vehicle-manual-awards";
import { vehicleManualAwardWriteSchema } from "@/lib/validation/vehicle-manual-award";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string; awardId: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const writeDenied = writeAccessDeniedResponse(user);
  if (writeDenied) return writeDenied;

  const { id: vehicleId, awardId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = vehicleManualAwardWriteSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const entry = await updateVehicleManualAward(
    user.id,
    vehicleId,
    awardId,
    parsed.data,
  );
  if (!entry) {
    return NextResponse.json({ error: "Award not found." }, { status: 404 });
  }

  return NextResponse.json({ award: entry });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const writeDenied = writeAccessDeniedResponse(user);
  if (writeDenied) return writeDenied;

  const { id: vehicleId, awardId } = await params;

  const ok = await deleteVehicleManualAward(user.id, vehicleId, awardId);
  if (!ok) {
    return NextResponse.json({ error: "Award not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
