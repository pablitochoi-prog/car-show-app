import { NextResponse } from "next/server";
import { canManageEvent, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  closeJudgeBallotCategory,
  openJudgeBallotCategory,
} from "@/lib/judging/judge-ballot-allocation";

type RouteParams = { params: Promise<{ id: string }> };

/** Open or close all judge ballot categories for an event (ballot only). */
export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const allowed = await canManageEvent(
    user.id,
    eventId,
    undefined,
    user.platformRole,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = (body as { action?: string })?.action;
  if (action !== "open_all" && action !== "close_all") {
    return NextResponse.json(
      { error: 'action must be "open_all" or "close_all".' },
      { status: 400 },
    );
  }

  if (action === "open_all") {
    const toOpen = await prisma.judgeBallotCategory.findMany({
      where: { eventId, status: { in: ["DRAFT", "CLOSED"] } },
      select: { id: true },
    });
    let opened = 0;
    for (const cat of toOpen) {
      await openJudgeBallotCategory(cat.id);
      opened++;
    }
    return NextResponse.json({ opened, closed: 0 });
  }

  const toClose = await prisma.judgeBallotCategory.findMany({
    where: { eventId, status: "OPEN" },
    select: { id: true },
  });
  let closed = 0;
  for (const cat of toClose) {
    await closeJudgeBallotCategory(cat.id, "CLOSED");
    closed++;
  }
  return NextResponse.json({ opened: 0, closed });
}
