import { countTotalAwardsForUser } from "@/lib/my-vehicle-awards";
import { NavTileLink } from "@/components/navigation/nav-tile-link";
import { AwardsCountBadge } from "@/components/dashboard/awards-count-badge";

export async function DashboardAwardsTile({ userId }: { userId: string }) {
  const totalAwards = await countTotalAwardsForUser(userId);

  return (
    <NavTileLink
      href="/dashboard/awards"
      title="My Awards & Trophies"
      description="Trophy history for every vehicle in your garage."
      icon="trophy"
      titleExtra={<AwardsCountBadge count={totalAwards} />}
    />
  );
}
