import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  adminAccountListSelect,
  serializeAdminAccountRow,
} from "@/lib/admin-account-rows";
import { applyAdminUserUpdate } from "@/lib/admin-update-user";
import { isSiteAdmin } from "@/lib/permissions";
import { parseAdminTableParams } from "@/lib/admin-table/parse-admin-table-params";
import {
  adminTableMeta,
  adminTableSkip,
} from "@/lib/admin-table/admin-table-response";
import {
  buildUsersAdminOrderBy,
  buildUsersAdminWhere,
  usersAdminTableConfig,
} from "@/lib/admin-table/users-table-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const params = parseAdminTableParams(
    req.nextUrl.searchParams,
    usersAdminTableConfig,
  );
  const where = buildUsersAdminWhere(params);
  const orderBy = buildUsersAdminOrderBy(params);
  const skip = adminTableSkip(params.page, params.pageSize);

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: params.pageSize,
      select: adminAccountListSelect,
    }),
  ]);

  return NextResponse.json({
    accounts: users.map(serializeAdminAccountRow),
    meta: adminTableMeta(total, params.page, params.pageSize),
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
