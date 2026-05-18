import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent, writeAccessDeniedResponse } from "@/lib/auth";
import { cloneEvent } from "@/lib/clone-event";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const writeDenied = writeAccessDeniedResponse(user);
  if (writeDenied) return writeDenied;

  const { id: sourceEventId } = await ctx.params;

  const source = await prisma.event.findUnique({
    where: { id: sourceEventId },
    select: { orgId: true },
  });
  if (!source) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const allowed = await canManageEvent(
    user.id,
    sourceEventId,
    source.orgId,
    user.platformRole,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const cloned = await cloneEvent(sourceEventId, user.id);
    return NextResponse.json({
      id: cloned.id,
      name: cloned.name,
      showNumber: cloned.showNumber,
    });
  } catch (err) {
    console.error("[POST /api/events/[id]/clone]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not clone event." },
      { status: 500 },
    );
  }
}
