import { prisma } from "@/lib/db";

export type MasterCategoryPickerRow = {
  id: string;
  name: string;
  groupName: string | null;
};

/** Site Admin master vehicle classes, grouped, for event organizer pick lists. */
export async function listMasterCategoriesForPicker(): Promise<
  MasterCategoryPickerRow[]
> {
  const groups = await prisma.categoryGroup.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true },
      },
    },
  });

  const ungrouped = await prisma.category.findMany({
    where: { groupId: null },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  const categories: MasterCategoryPickerRow[] = [];
  for (const group of groups) {
    for (const category of group.categories) {
      categories.push({
        id: category.id,
        name: category.name,
        groupName: group.name,
      });
    }
  }
  for (const category of ungrouped) {
    categories.push({
      id: category.id,
      name: category.name,
      groupName: null,
    });
  }
  return categories;
}
