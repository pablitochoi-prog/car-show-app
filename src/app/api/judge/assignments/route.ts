import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadJudgeBallotAssignments } from "@/lib/judging/judge-ballot-judge-data";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await loadJudgeBallotAssignments(user.id);
  return NextResponse.json({ events });
}
