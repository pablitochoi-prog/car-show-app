import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import {
  getDefaultRoleTemplate,
  addDefaultRole,
  removeDefaultRole,
  updateDefaultRole,
  reorderDefaultRoles,
} from "@/lib/admin-staff-roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ roles: await getDefaultRoleTemplate() });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as { name?: string; slug?: string };
  const name = body.name?.trim();
  if (!name || name.length < 1)
    return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const result = await addDefaultRole(name, body.slug?.trim() || null);
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: 409 });

  return NextResponse.json({ roles: await getDefaultRoleTemplate() }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as { slug?: string; name?: string; reorder?: string[] };

  if (body.reorder) {
    await reorderDefaultRoles(body.reorder);
    return NextResponse.json({ roles: await getDefaultRoleTemplate() });
  }

  if (!body.slug)
    return NextResponse.json({ error: "slug is required" }, { status: 400 });

  const result = await updateDefaultRole(body.slug, body.name?.trim() ?? "");
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ roles: await getDefaultRoleTemplate() });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug)
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  await removeDefaultRole(slug);
  return NextResponse.json({ roles: await getDefaultRoleTemplate() });
}
