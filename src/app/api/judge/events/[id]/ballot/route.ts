import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  JudgeBallotAccessError,
  loadJudgeBallotCategoriesForEvent,
} from "@/lib/judging/judge-ballot-judge-data";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  try {
    const categories = await loadJudgeBallotCategoriesForEvent(
      user.id,
      eventId,
    );
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, showNumber: true },
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    return NextResponse.json({ event, categories });
  } catch (err) {
    if (err instanceof JudgeBallotAccessError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 403 });
    }
    throw err;
  }
}
