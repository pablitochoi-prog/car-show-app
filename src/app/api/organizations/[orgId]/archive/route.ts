import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireOrgOwner } from "@/lib/auth";

type RouteParams = { params: Promise<{ orgId: string }> };

const archiveBodySchema = z.object({
  archived: z.boolean(),
});

/** Soft-archive or restore a club listing. Owner only. */
export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;
  if (!orgId) {
    return NextResponse.json({ error: "Missing organization id" }, { status: 400 });
  }

  try {
    await requireOrgOwner(user.id, orgId);
  } catch {
    return NextResponse.json(
      { error: "Only the club owner can archive this organization." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = archiveBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Expected { archived: boolean }" }, { status: 400 });
  }

  const { archived } = parsed.data;

  try {
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        archivedAt: archived ? new Date() : null,
      },
    });
    return NextResponse.json({ ok: true, archived });
  } catch (err) {
    console.error("[POST /api/organizations/[orgId]/archive]", err);
    const raw = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "Could not update archive status.",
        ...(process.env.NODE_ENV === "development" ? { detail: raw } : {}),
      },
      { status: 500 }
    );
  }
}
