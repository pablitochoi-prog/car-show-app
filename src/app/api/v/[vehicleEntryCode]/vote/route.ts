import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { findVehicleEntryByCode } from "@/lib/vehicle-entry-lookup";
import {
  getOrCreateVoterKey,
  recordPublicVote,
} from "@/lib/vehicle-voting";
import {
  vehicleEntryCodePrefix,
  withPerfTimingResponse,
} from "@/lib/perf-timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  votingCategoryId: z.string().min(1),
});

type RouteParams = {
  params: Promise<{ vehicleEntryCode: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { vehicleEntryCode } = await params;
  const codePrefix = vehicleEntryCodePrefix(vehicleEntryCode);
  const timingMeta: { codePrefix?: string; eventId?: string } = { codePrefix };
  return withPerfTimingResponse(
    "api.v.vote",
    () => timingMeta,
    async () => postVote(request, vehicleEntryCode, timingMeta),
  );
}

async function postVote(
  request: Request,
  vehicleEntryCode: string,
  timingMeta: { eventId?: string },
) {
  const entry = await findVehicleEntryByCode(vehicleEntryCode);
  if (!entry) {
    return NextResponse.json({ error: "Vehicle entry not found." }, { status: 404 });
  }

  timingMeta.eventId = entry.eventId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "votingCategoryId is required." },
      { status: 400 },
    );
  }

  const fingerprint = await getOrCreateVoterKey();
  const user = await getCurrentUser();

  const result = await recordPublicVote(
    entry,
    fingerprint,
    parsed.data.votingCategoryId,
    user?.id ?? null,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
