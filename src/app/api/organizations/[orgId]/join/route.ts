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

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, archivedAt: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Club not found." }, { status: 404 });
  }
  if (org.archivedAt) {
    return NextResponse.json(
      { error: "This club is archived and cannot accept new members." },
      { status: 400 },
    );
  }

  const existing = await prisma.organizationMember.findUnique({
    where: { userId_orgId: { userId: user.id, orgId } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You are already a member of this club." },
      { status: 409 },
    );
  }

  const membership = await prisma.organizationMember.create({
    data: { userId: user.id, orgId, role: "member" },
  });

  return NextResponse.json(
    { membershipId: membership.id },
    { status: 201 },
  );
}
