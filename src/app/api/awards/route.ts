import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const awards = await prisma.specialAward.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, isSystem: true },
  });

  return NextResponse.json({ awards });
}
