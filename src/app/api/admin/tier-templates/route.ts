import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import {
  getTierTemplates,
  addTierTemplate,
  renameTierTemplate,
  removeTierTemplate,
  reorderTierTemplates,
} from "@/lib/admin-tier-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ templates: await getTierTemplates() });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as { name?: string };
  const name = body.name?.trim();
  if (!name)
    return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const result = await addTierTemplate(name);
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: 409 });

  return NextResponse.json({ templates: await getTierTemplates() }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as {
    slug?: string;
    name?: string;
    reorder?: string[];
  };

  if (body.reorder) {
    await reorderTierTemplates(body.reorder);
    return NextResponse.json({ templates: await getTierTemplates() });
  }

  if (!body.slug)
    return NextResponse.json({ error: "slug is required" }, { status: 400 });

  const result = await renameTierTemplate(body.slug, body.name?.trim() ?? "");
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ templates: await getTierTemplates() });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug)
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  await removeTierTemplate(slug);
  return NextResponse.json({ templates: await getTierTemplates() });
}
