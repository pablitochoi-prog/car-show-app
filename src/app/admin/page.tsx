import { prisma } from "@/lib/db";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { AdminClubsSection } from "@/components/admin/admin-clubs-section";
import { AdminEventsSection } from "@/components/admin/admin-events-section";
import { AdminAccountsSection } from "@/components/admin/admin-accounts-section";
import { AdminAwardsSection } from "@/components/admin/admin-awards-section";
import { AdminVehiclesSection } from "@/components/admin/admin-vehicles-section";
import { AdminCategoryFolders } from "@/components/admin/admin-category-folders";
import { AdminAwardList } from "@/components/admin/admin-award-list";
import { AdminStaffRolesSection } from "@/components/admin/admin-staff-roles-section";
import { AdminTierTemplatesSection } from "@/components/admin/admin-tier-templates-section";

export default async function AdminDashboardPage() {
  const awards = await prisma.specialAward.findMany({ orderBy: { sortOrder: "asc" } });

  const serializedAwards = awards.map((a) => ({
    id: a.id,
    name: a.name,
    isSystem: a.isSystem,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Site Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage all clubs, events, accounts, vehicles, awards, and global settings.
        </p>
      </div>

      <div className="space-y-4">
        <CollapsibleCard title="Clubs" defaultOpen={false}>
          <AdminClubsSection />
        </CollapsibleCard>

        <CollapsibleCard title="Events" defaultOpen={false}>
          <AdminEventsSection />
        </CollapsibleCard>

        <CollapsibleCard title="Accounts" defaultOpen={false}>
          <AdminAccountsSection />
        </CollapsibleCard>

        <CollapsibleCard title="Awards" defaultOpen={false}>
          <AdminAwardsSection />
        </CollapsibleCard>

        <CollapsibleCard title="Vehicles" defaultOpen={false}>
          <AdminVehiclesSection />
        </CollapsibleCard>

        <CollapsibleCard title="Global Settings" defaultOpen={false}>
          <div className="space-y-4">
            <CollapsibleCard title="Registration Categories" defaultOpen={false}>
              <p className="mb-3 text-xs text-muted-foreground">
                Organize categories into groups (folders) like &quot;By Vehicle Year&quot;, &quot;By Type&quot;, &quot;By Manufacturer&quot;, etc.
                Event organizers can expand each group to browse and select categories for their show.
              </p>
              <AdminCategoryFolders />
            </CollapsibleCard>

            <CollapsibleCard title="Award Categories" defaultOpen={false}>
              <p className="mb-3 text-xs text-muted-foreground">
                Master list of award names available to all events. Drag to reorder.
              </p>
              <AdminAwardList initialAwards={serializedAwards} />
            </CollapsibleCard>

            <CollapsibleCard title="Registration Tier Templates" defaultOpen={false}>
              <AdminTierTemplatesSection />
            </CollapsibleCard>

            <CollapsibleCard title="Default Staff Roles" defaultOpen={false}>
              <AdminStaffRolesSection />
            </CollapsibleCard>
          </div>
        </CollapsibleCard>
      </div>
    </div>
  );
}
