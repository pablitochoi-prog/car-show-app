import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const groups = await prisma.categoryGroup.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      categories: { orderBy: { sortOrder: "asc" } },
    },
  });

  const ungrouped = await prisma.category.findMany({
    where: { groupId: null },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      sortOrder: g.sortOrder,
      categories: g.categories.map((c) => ({
        id: c.id,
        name: c.name,
        sortOrder: c.sortOrder,
      })),
    })),
    ungrouped: ungrouped.map((c) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();
  if (!name)
    return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const existing = await prisma.categoryGroup.findUnique({ where: { name } });
  if (existing)
    return NextResponse.json({ error: "A group with that name already exists." }, { status: 409 });

  const maxSort = await prisma.categoryGroup.aggregate({ _max: { sortOrder: true } });
  const group = await prisma.categoryGroup.create({
    data: { name, sortOrder: (maxSort._max.sortOrder ?? 0) + 1 },
  });

  return NextResponse.json({ group }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as {
    id?: string;
    name?: string;
    orderedGroupIds?: string[];
    orderedCategoryIds?: string[];
    assignCategory?: { categoryId: string; groupId: string | null };
  };

  if (body.assignCategory) {
    const { categoryId, groupId } = body.assignCategory;
    await prisma.category.update({
      where: { id: categoryId },
      data: { groupId },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.id && body.name?.trim()) {
    const name = body.name.trim();
    const dup = await prisma.categoryGroup.findFirst({
      where: { name, NOT: { id: body.id } },
    });
    if (dup)
      return NextResponse.json({ error: "A group with that name already exists." }, { status: 409 });
    await prisma.categoryGroup.update({ where: { id: body.id }, data: { name } });
    return NextResponse.json({ ok: true });
  }

  if (body.orderedCategoryIds?.length) {
    await prisma.$transaction(
      body.orderedCategoryIds.map((id, i) =>
        prisma.category.update({ where: { id }, data: { sortOrder: i } }),
      ),
    );
    return NextResponse.json({ ok: true });
  }

  if (body.orderedGroupIds?.length) {
    await prisma.$transaction(
      body.orderedGroupIds.map((id, i) =>
        prisma.categoryGroup.update({ where: { id }, data: { sortOrder: i } }),
      ),
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "Missing id." }, { status: 400 });

  await prisma.category.updateMany({
    where: { groupId: id },
    data: { groupId: null },
  });
  await prisma.categoryGroup.delete({ where: { id } }).catch(() => null);

  return NextResponse.json({ ok: true });
}
