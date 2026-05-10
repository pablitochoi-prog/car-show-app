import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();
  if (!name || name.length < 1) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const existing = await prisma.category.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "A category with that name already exists." }, { status: 409 });
  }

  const maxSort = await prisma.category.aggregate({ _max: { sortOrder: true } });
  const category = await prisma.category.create({
    data: { name, isSystem: true, sortOrder: (maxSort._max.sortOrder ?? 0) + 1 },
  });

  return NextResponse.json({ category }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { orderedIds?: string[]; id?: string; name?: string };

  if (body.id && body.name?.trim()) {
    const name = body.name.trim();
    const dup = await prisma.category.findFirst({ where: { name, NOT: { id: body.id } } });
    if (dup) return NextResponse.json({ error: "A category with that name already exists." }, { status: 409 });
    await prisma.category.update({ where: { id: body.id }, data: { name } });
    const updated = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
    return NextResponse.json({
      categories: updated.map((c) => ({ id: c.id, name: c.name, isSystem: c.isSystem, sortOrder: c.sortOrder })),
    });
  }

  if (!body.orderedIds?.length)
    return NextResponse.json({ error: "orderedIds or id+name required" }, { status: 400 });

  await prisma.$transaction(
    body.orderedIds.map((id, i) =>
      prisma.category.update({ where: { id }, data: { sortOrder: i } }),
    ),
  );

  const updated = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({
    categories: updated.map((c) => ({ id: c.id, name: c.name, isSystem: c.isSystem, sortOrder: c.sortOrder })),
  });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing category id." }, { status: 400 });
  }

  await prisma.category.delete({ where: { id } }).catch(() => null);

  return NextResponse.json({ ok: true });
}
