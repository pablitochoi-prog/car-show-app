import { prisma } from "@/lib/db";
import { AdminAwardList } from "@/components/admin/admin-award-list";

export default async function AdminAwardsPage() {
  const awards = await prisma.specialAward.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const serialized = awards.map((a) => ({
    id: a.id,
    name: a.name,
    isSystem: a.isSystem,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Special Awards</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the master list of special award names available to all car show
          events.
        </p>
      </div>
      <AdminAwardList initialAwards={serialized} />
    </div>
  );
}
