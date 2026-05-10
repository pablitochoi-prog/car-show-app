import { prisma } from "@/lib/db";
import { AdminCategoryList } from "@/components/admin/admin-category-list";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const serialized = categories.map((c) => ({
    id: c.id,
    name: c.name,
    isSystem: c.isSystem,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Registration Categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the master list of registration/judging categories available to
          all car show events.
        </p>
      </div>
      <AdminCategoryList initialCategories={serialized} />
    </div>
  );
}
