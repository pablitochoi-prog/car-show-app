import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type RouteParams = { params: Promise<{ orgId: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_orgId: { userId: user.id, orgId } },
    select: { id: true, role: true },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of this club." },
      { status: 404 },
    );
  }

  if (membership.role === "owner") {
    return NextResponse.json(
      { error: "The club owner cannot leave. Transfer ownership first." },
      { status: 400 },
    );
  }

  await prisma.organizationMember.delete({
    where: { id: membership.id },
  });

  return NextResponse.json({ ok: true });
}
