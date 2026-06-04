import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  countTotalAwardsForUser,
  loadMyGarageAwards,
} from "@/lib/my-vehicle-awards";
import { MyAwardsGarage } from "@/components/dashboard/my-awards-garage";
import { AwardsCountBadge } from "@/components/dashboard/awards-count-badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function MyAwardsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [sections, totalAwards] = await Promise.all([
    loadMyGarageAwards(user.id),
    countTotalAwardsForUser(user.id),
  ]);

  return (
    <div className="page-shell max-w-5xl space-y-8">
      <div className="page-head flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">My awards &amp; trophies</h1>
            <AwardsCountBadge count={totalAwards} className="text-sm" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Trophy history for each vehicle in your garage.
          </p>
        </div>
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full justify-center sm:w-auto",
          )}
        >
          Back to dashboard
        </Link>
      </div>

      <MyAwardsGarage sections={sections} totalAwards={totalAwards} />
    </div>
  );
}
