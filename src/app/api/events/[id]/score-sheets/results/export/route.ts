import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canManageEvent, getCurrentUser } from "@/lib/auth";
import {
  aggregateScoreSheetResults,
  buildScoreSheetResultsCsv,
} from "@/lib/judging/score-sheet-results";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
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

  const url = new URL(request.url);
  const judgingClassId = url.searchParams.get("judgingClassId")?.trim();
  if (!judgingClassId) {
    return NextResponse.json(
      { error: "judgingClassId query parameter is required." },
      { status: 400 },
    );
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { name: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const results = await aggregateScoreSheetResults(eventId, judgingClassId, {
    includeOwnerNames: true,
  });
  if (!results) {
    return NextResponse.json({ error: "Judging class not found." }, { status: 404 });
  }

  const csv = buildScoreSheetResultsCsv({
    eventName: event.name,
    judgingClassName: results.judgingClass.name,
    ranked: results.ranked,
    unrankedDraftOnly: results.unrankedDraftOnly,
  });

  const slug = results.judgingClass.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="score-sheet-results-${eventId.slice(0, 8)}-${slug || "class"}.csv"`,
    },
  });
}
