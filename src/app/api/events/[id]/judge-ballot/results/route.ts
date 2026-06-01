import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canManageEvent, getCurrentUser } from "@/lib/auth";
import { aggregateJudgeBallotResults } from "@/lib/judging/judge-ballot-results";

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
  const categoryId = url.searchParams.get("categoryId")?.trim();
  if (!categoryId) {
    return NextResponse.json(
      { error: "categoryId query parameter is required." },
      { status: 400 },
    );
  }

  const category = await prisma.judgeBallotCategory.findFirst({
    where: { id: categoryId, eventId },
    select: { id: true, name: true, status: true },
  });
  if (!category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const includeVoteSpread = url.searchParams.get("includeVoteSpread") === "1";
  const results = await aggregateJudgeBallotResults(categoryId, {
    includeVoteSpread,
  });

  const publicResults = results.map(
    ({ voteSpreadByJudge: _spread, ...row }) => row,
  );

  return NextResponse.json({
    category,
    results: includeVoteSpread ? results : publicResults,
  });
}
