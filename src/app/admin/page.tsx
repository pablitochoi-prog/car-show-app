import { prisma } from "@/lib/db";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { listSpecialAwardsForAdmin } from "@/lib/sms/sms-voting-eligible-awards";
import { AdminClubsSection } from "@/components/admin/admin-clubs-section";
import { AdminEventsSection } from "@/components/admin/admin-events-section";
import { AdminAccountsSection } from "@/components/admin/admin-accounts-section";
import { AdminAwardsSection } from "@/components/admin/admin-awards-section";
import { AdminVehiclesSection } from "@/components/admin/admin-vehicles-section";
import { AdminCategoryFolders } from "@/components/admin/admin-category-folders";
import { AdminAwardList } from "@/components/admin/admin-award-list";
import { AdminStaffRolesSection } from "@/components/admin/admin-staff-roles-section";
import { AdminTierTemplatesSection } from "@/components/admin/admin-tier-templates-section";
import { AdminConvenienceFee } from "@/components/admin/admin-convenience-fee";
import { AdminEventSetupFee } from "@/components/admin/admin-event-setup-fee";
import { AdminPlatformStripe } from "@/components/admin/admin-platform-stripe";
import { AdminPlatformSponsor } from "@/components/admin/admin-platform-sponsor";
import {
  adminAccountListSelect,
  serializeAdminAccountRow,
} from "@/lib/admin-account-rows";

export default async function AdminDashboardPage() {
  const [awards, , users] = await Promise.all([
    listSpecialAwardsForAdmin(),
    Promise.all([
      prisma.globalSetting.upsert({
        where: { key: "platform_fee" },
        update: {},
        create: {
          key: "platform_fee",
          value: { type: "FIXED", amountCents: 50, percent: null },
        },
      }),
      prisma.globalSetting.upsert({
        where: { key: "event_setup_fee" },
        update: {},
        create: {
          key: "event_setup_fee",
          value: { amountCents: 7500 },
        },
      }),
    ]),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: adminAccountListSelect,
    }),
  ]);

  const initialAccounts = users.map(serializeAdminAccountRow);

  const serializedAwards = awards.map((a) => ({
    id: a.id,
    name: a.name,
    isSystem: true,
    smsVotingEligible: a.smsVotingEligible,
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

        <CollapsibleCard title="Users" defaultOpen={false} keepMounted>
          <AdminAccountsSection initialAccounts={initialAccounts} />
        </CollapsibleCard>

        <CollapsibleCard title="Awards" defaultOpen={false}>
          <AdminAwardsSection />
        </CollapsibleCard>

        <CollapsibleCard title="Vehicles" defaultOpen={false}>
          <AdminVehiclesSection />
        </CollapsibleCard>

        <CollapsibleCard title="Global Settings" defaultOpen={false}>
          <div className="space-y-4">
            <CollapsibleCard title="Fee Options" defaultOpen={false}>
              <div className="space-y-8">
                <div>
                  <h3 className="mb-1 text-sm font-semibold">
                    Platform Stripe (CarShowScout.com)
                  </h3>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Site admin account that receives convenience fees and flat
                    platform fee payments from clubs.
                  </p>
                  <AdminPlatformStripe />
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-semibold">Convenience fee</h3>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Per-vehicle platform fee applied when an organizer chooses
                    convenience fee billing for an event.
                  </p>
                  <AdminConvenienceFee />
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-semibold">Event setup fee</h3>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Flat platform fee per event when an organizer chooses event
                    setup fee billing instead of per-vehicle convenience fee.
                  </p>
                  <AdminEventSetupFee />
                </div>
              </div>
            </CollapsibleCard>

            <CollapsibleCard title="Registration Categories" defaultOpen={false}>
              <p className="mb-3 text-xs text-muted-foreground">
                Organize categories into groups (folders) like &quot;By Vehicle Year&quot;, &quot;By Type&quot;, &quot;By Manufacturer&quot;, etc.
                Event organizers can expand each group to browse and select categories for their show.
              </p>
              <AdminCategoryFolders />
            </CollapsibleCard>

            <CollapsibleCard title="Registration Tier Templates" defaultOpen={false}>
              <AdminTierTemplatesSection />
            </CollapsibleCard>

            <CollapsibleCard title="Award Categories" defaultOpen={false}>
              <p className="mb-3 text-xs text-muted-foreground">
                Master list of award names available to all events. Drag to reorder.
                People&apos;s Choice and Kid&apos;s Choice are always public vote
                categories (SMS or QR). All other awards are judge graded unless
                marked as public vote.
              </p>
              <AdminAwardList initialAwards={serializedAwards} />
            </CollapsibleCard>

            <CollapsibleCard title="Default Staff Roles" defaultOpen={false}>
              <AdminStaffRolesSection />
            </CollapsibleCard>

            <CollapsibleCard title="Platform Sponsor" defaultOpen={false}>
              <AdminPlatformSponsor />
            </CollapsibleCard>
          </div>
        </CollapsibleCard>
      </div>
    </div>
  );
}
