import Link from "next/link";
import { VehiclePhotoDisplay } from "@/components/vehicle/vehicle-photo-display";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { AddVehicleSection } from "./add-vehicle-section";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VehicleRowActions } from "./vehicle-row-actions";

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

  const vehicles = await prisma.vehicle.findMany({
    where: { userId: user.id },
    orderBy: [{ make: "asc" }, { model: "asc" }],
  });

  return (
    <div className="page-shell max-w-3xl space-y-8">
      <div className="page-head flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">My vehicles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Saved cars you can attach when registering for shows.
          </p>
        </div>
        <Link
          href={returnTo ?? "/dashboard"}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full justify-center sm:w-auto"
          )}
        >
          {returnTo ? "Back to registration" : "Back to dashboard"}
        </Link>
      </div>

      {/* Vehicle list */}
      {vehicles.length > 0 && (
        <ul className="divide-y rounded-md border">
          {vehicles.map((v) => (
            <li
              key={v.id}
              className="flex items-start justify-between gap-2 px-3 py-3 text-sm"
            >
              <span className="flex min-w-0 items-start gap-3">
                {v.photoUrl ? (
                  <VehiclePhotoDisplay
                    src={v.photoUrl}
                    alt=""
                    size="thumb"
                    className="w-20"
                  />
                ) : null}
                <span className="min-w-0">
                  <span className="font-medium">
                    {v.year} {v.make} {v.model}
                  </span>
                  {v.trim ? ` ${v.trim}` : ""}
                  {v.nickname ? (
                    <span className="block text-xs italic text-muted-foreground">
                      &quot;{v.nickname}&quot;
                    </span>
                  ) : null}
                  {v.notes ? (
                    <span className="block text-muted-foreground line-clamp-1">
                      {v.notes}
                    </span>
                  ) : null}
                </span>
              </span>
              <VehicleRowActions vehicleId={v.id} />
            </li>
          ))}
        </ul>
      )}

      {/* Collapsible Add Vehicle section */}
      <AddVehicleSection
        autoOpen={vehicles.length === 0 || !!returnTo}
        returnTo={returnTo}
      />
    </div>
  );
}
