import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters." },
      { status: 400 },
    );
  }

  const existingOrgIds = await prisma.organizationMember.findMany({
    where: { userId: user.id },
    select: { orgId: true },
  });
  const excludeIds = existingOrgIds.map((m) => m.orgId);

  const clubs = await prisma.organization.findMany({
    where: {
      archivedAt: null,
      id: { notIn: excludeIds.length > 0 ? excludeIds : undefined },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { state: { contains: q, mode: "insensitive" } },
        { clubState: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      clubState: true,
      city: true,
      state: true,
      logo: true,
      motto: true,
      members: {
        where: { role: "owner" },
        select: { user: { select: { firstName: true, lastName: true, name: true } } },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
    take: 20,
  });

  const result = clubs.map((c) => {
    const owner = c.members[0]?.user;
    const organizerName = owner
      ? [owner.firstName, owner.lastName].filter(Boolean).join(" ") || owner.name
      : null;
    return {
      id: c.id,
      name: c.name,
      clubState: c.clubState,
      city: c.city,
      state: c.state,
      logo: c.logo,
      motto: c.motto,
      organizerName,
    };
  });

  return NextResponse.json({ clubs: result });
}
