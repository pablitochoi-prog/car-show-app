import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const awards = await prisma.specialAward.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ awards });
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

  const existing = await prisma.specialAward.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "An award with that name already exists." }, { status: 409 });
  }

  const maxSort = await prisma.specialAward.aggregate({ _max: { sortOrder: true } });
  const award = await prisma.specialAward.create({
    data: { name, isSystem: true, sortOrder: (maxSort._max.sortOrder ?? 0) + 1 },
  });

  return NextResponse.json({ award }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { orderedIds?: string[]; id?: string; name?: string };

  if (body.id && body.name?.trim()) {
    const name = body.name.trim();
    const dup = await prisma.specialAward.findFirst({ where: { name, NOT: { id: body.id } } });
    if (dup) return NextResponse.json({ error: "An award with that name already exists." }, { status: 409 });
    await prisma.specialAward.update({ where: { id: body.id }, data: { name } });
    const updated = await prisma.specialAward.findMany({ orderBy: { sortOrder: "asc" } });
    return NextResponse.json({
      awards: updated.map((a) => ({ id: a.id, name: a.name, isSystem: a.isSystem, sortOrder: a.sortOrder })),
    });
  }

  if (!body.orderedIds?.length)
    return NextResponse.json({ error: "orderedIds or id+name required" }, { status: 400 });

  await prisma.$transaction(
    body.orderedIds.map((id, i) =>
      prisma.specialAward.update({ where: { id }, data: { sortOrder: i } }),
    ),
  );

  const updated = await prisma.specialAward.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({
    awards: updated.map((a) => ({ id: a.id, name: a.name, isSystem: a.isSystem, sortOrder: a.sortOrder })),
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
    return NextResponse.json({ error: "Missing award id." }, { status: 400 });
  }

  await prisma.specialAward.delete({ where: { id } }).catch(() => null);

  return NextResponse.json({ ok: true });
}
