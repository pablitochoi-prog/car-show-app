import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const templates = await prisma.judgingTemplate.findMany({
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }],
    include: {
      _count: { select: { sections: true, eventCopies: true } },
    },
  });

  return NextResponse.json({
    templates: templates.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      methodology: t.methodology,
      totalPoints: t.totalPoints,
      scoringGroup: t.scoringGroup,
      vehicleType: t.vehicleType,
      sortOrder: t.sortOrder,
      sectionCount: t._count.sections,
      eventCopyCount: t._count.eventCopies,
      isActive: t.isActive,
    })),
  });
}
