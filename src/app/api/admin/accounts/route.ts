import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  adminAccountListSelect,
  serializeAdminAccountRow,
} from "@/lib/admin-account-rows";
import { applyAdminUserUpdate } from "@/lib/admin-update-user";
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await applyAdminUserUpdate(
    body as Parameters<typeof applyAdminUserUpdate>[0],
    { id: user.id, platformRole: user.platformRole },
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ account: result.user });
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
