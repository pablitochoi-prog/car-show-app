import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const where = q
    ? {
        OR: [
          { firstName: { contains: q, mode: "insensitive" as const } },
          { lastName: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      email: true,
      platformRole: true,
      archivedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    accounts: users.map((u) => ({
      id: u.id,
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      email: u.email,
      platformRole: u.platformRole,
      archivedAt: u.archivedAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as {
    id?: string;
    firstName?: string;
    lastName?: string;
    platformRole?: string;
    archive?: boolean;
  };
  if (!body.id)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const validRoles = ["USER", "ORGANIZER", "ADMIN"];
  if (body.platformRole && !validRoles.includes(body.platformRole))
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.firstName !== undefined) data.firstName = body.firstName.trim() || null;
  if (body.lastName !== undefined) data.lastName = body.lastName.trim() || null;
  if (body.firstName !== undefined || body.lastName !== undefined) {
    const fn = body.firstName?.trim() ?? "";
    const ln = body.lastName?.trim() ?? "";
    data.name = [fn, ln].filter(Boolean).join(" ") || "Unnamed";
  }
  if (body.platformRole) data.platformRole = body.platformRole;
  if (body.archive === true) data.archivedAt = new Date();
  if (body.archive === false) data.archivedAt = null;

  const updated = await prisma.user.update({
    where: { id: body.id },
    data,
    select: { id: true, firstName: true, lastName: true, platformRole: true },
  });

  return NextResponse.json({
    account: {
      ...updated,
      firstName: updated.firstName ?? "",
      lastName: updated.lastName ?? "",
    },
  });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (id === user.id)
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });

  await prisma.user.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
