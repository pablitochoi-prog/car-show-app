import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groups = await prisma.categoryGroup.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, isSystem: true, sortOrder: true },
      },
    },
  });

  const ungrouped = await prisma.category.findMany({
    where: { groupId: null },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, isSystem: true, sortOrder: true },
  });

  // Flat list preserving group order: grouped categories first, then ungrouped
  const categories: { id: string; name: string; isSystem: boolean; groupName: string | null }[] = [];
  for (const g of groups) {
    for (const c of g.categories) {
      categories.push({ id: c.id, name: c.name, isSystem: c.isSystem, groupName: g.name });
    }
  }
  for (const c of ungrouped) {
    categories.push({ id: c.id, name: c.name, isSystem: c.isSystem, groupName: null });
  }

  return NextResponse.json({ categories });
}
