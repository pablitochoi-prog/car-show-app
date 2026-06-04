import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadGarageVehiclesForUser } from "@/lib/garage-vehicle";
import { AddVehicleSection } from "./add-vehicle-section";
import { MyVehiclesList } from "@/components/dashboard/my-vehicles-list";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  searchParams: Promise<{ returnTo?: string }>;
};

/** Only allow in-app relative paths (e.g. event registration). */
function safeReturnTo(raw: string | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  if (!raw.startsWith("/events/")) return null;
  return raw;
}

export default async function VehiclesPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { returnTo: returnToRaw } = await searchParams;
  const returnTo = safeReturnTo(returnToRaw);

  const vehicles = await loadGarageVehiclesForUser(user.id);

  return (
    <div className="page-shell max-w-3xl space-y-8">
      <div className="page-head flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">My vehicles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Saved cars in your garage — reuse them when registering for any show.
          </p>
        </div>
        <Link
          href={returnTo ?? "/dashboard"}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full justify-center sm:w-auto",
          )}
        >
          {returnTo ? "Back to registration" : "Back to dashboard"}
        </Link>
      </div>

      <MyVehiclesList vehicles={vehicles} />

      <AddVehicleSection
        autoOpen={vehicles.length === 0 || !!returnTo}
        returnTo={returnTo}
      />
    </div>
  );
}
