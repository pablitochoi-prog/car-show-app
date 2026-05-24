import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findVehicleEntryByCode } from "@/lib/vehicle-entry-lookup";
import {
  buildVoterKey,
  getOrCreateVoterKey,
  recordPublicVote,
} from "@/lib/vehicle-voting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ vehicleEntryCode: string }>;
};

export async function POST(_request: Request, { params }: RouteParams) {
  const { vehicleEntryCode } = await params;
  const entry = await findVehicleEntryByCode(vehicleEntryCode);
  if (!entry) {
    return NextResponse.json({ error: "Vehicle entry not found." }, { status: 404 });
  }

  const fingerprint = await getOrCreateVoterKey();
  const voterKey = buildVoterKey(
    fingerprint,
    entry.eventId,
    entry.vehicleEntryCode,
  );
  const user = await getCurrentUser();

  const result = await recordPublicVote(entry, voterKey, user?.id ?? null);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
