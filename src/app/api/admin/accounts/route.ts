import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  adminAccountListSelect,
  serializeAdminAccountRow,
} from "@/lib/admin-account-rows";
import { isSiteAdmin } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES = ["ACTIVE", "SUSPENDED", "BANNED"] as const;
const VALID_ROLES = ["USER", "ORGANIZER", "ADMIN"];

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
    select: adminAccountListSelect,
  });

  return NextResponse.json({
    accounts: users.map(serializeAdminAccountRow),
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
    status?: string;
    statusReason?: string | null;
    archive?: boolean;
  };
  if (!body.id)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (body.platformRole && !VALID_ROLES.includes(body.platformRole))
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  if (body.status && !VALID_STATUSES.includes(body.status as (typeof VALID_STATUSES)[number]))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  if (body.id === user.id && body.status && body.status !== "ACTIVE")
    return NextResponse.json(
      { error: "You cannot suspend or ban your own account" },
      { status: 400 },
    );

  const data: Record<string, unknown> = {};
  if (body.firstName !== undefined) data.firstName = body.firstName.trim() || null;
  if (body.lastName !== undefined) data.lastName = body.lastName.trim() || null;
  if (body.firstName !== undefined || body.lastName !== undefined) {
    const fn = body.firstName?.trim() ?? "";
    const ln = body.lastName?.trim() ?? "";
    data.name = [fn, ln].filter(Boolean).join(" ") || "Unnamed";
  }
  if (body.platformRole) data.platformRole = body.platformRole;
  if (body.status) {
    data.status = body.status;
    data.statusChangedAt = new Date();
    if (body.statusReason !== undefined) {
      data.statusReason = body.statusReason?.trim() || null;
    }
  } else if (body.statusReason !== undefined) {
    data.statusReason = body.statusReason?.trim() || null;
  }
  if (body.archive === true) data.archivedAt = new Date();
  if (body.archive === false) data.archivedAt = null;

  const updated = await prisma.user.update({
    where: { id: body.id },
    data,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      platformRole: true,
      status: true,
      statusReason: true,
      statusChangedAt: true,
      archivedAt: true,
    },
  });

  return NextResponse.json({
    account: {
      ...updated,
      firstName: updated.firstName ?? "",
      lastName: updated.lastName ?? "",
      statusChangedAt: updated.statusChangedAt?.toISOString() ?? null,
      archivedAt: updated.archivedAt?.toISOString() ?? null,
    },
  });
}

/** Legacy DELETE — use POST /api/admin/accounts/[id]/delete for reassignment flow. */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (id === user.id)
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });

  return NextResponse.json(
    {
      error:
        "Use the permanent delete dialog to reassign events, registrations, and vehicles first.",
    },
    { status: 400 },
  );
}
