import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getEventVotingDataCounts,
  resetEventVotingData,
} from "@/lib/event-voting-reset";
import { isSiteAdmin } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

async function requireSiteAdmin() {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

async function loadEvent(eventId: string) {
  return prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, showNumber: true },
  });
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireSiteAdmin();
  if ("error" in auth) return auth.error;

  const { id: eventId } = await params;
  const event = await loadEvent(eventId);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const counts = await getEventVotingDataCounts(eventId);
  return NextResponse.json({
    eventId: event.id,
    eventName: event.name,
    showNumber: event.showNumber,
    ...counts,
    totalVotes: counts.webVotes + counts.smsVotes,
  });
}

export async function POST(_request: Request, { params }: RouteParams) {
  const auth = await requireSiteAdmin();
  if ("error" in auth) return auth.error;

  const { id: eventId } = await params;
  const event = await loadEvent(eventId);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const deleted = await resetEventVotingData(eventId);
  return NextResponse.json({
    ok: true,
    eventId: event.id,
    eventName: event.name,
    deleted,
    totalVotesDeleted: deleted.webVotes + deleted.smsVotes,
  });
}
