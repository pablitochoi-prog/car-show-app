"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { VehiclePhotoDisplay } from "@/components/vehicle/vehicle-photo-display";
import { VehicleAwardsHistory } from "@/components/dashboard/vehicle-awards-history";
import { AwardsCountBadge } from "@/components/dashboard/awards-count-badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatVinMaskLastFour } from "@/lib/vehicle-vin";
import type { GarageVehicleListItem } from "@/lib/garage-vehicle";
import type { MyGarageVehicleAwardsSection } from "@/lib/my-vehicle-awards";

export function GarageVehicleView({
  vehicle,
  awardsSection,
}: {
  vehicle: GarageVehicleListItem;
  awardsSection: MyGarageVehicleAwardsSection;
}) {
  const router = useRouter();
  const ymm = [vehicle.year, vehicle.make, vehicle.model]
    .filter(Boolean)
    .join(" ");
  const vinMask = formatVinMaskLastFour(vehicle.vin);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
        <h1 className="truncate text-lg font-semibold">{ymm}</h1>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/dashboard/vehicles/${vehicle.id}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Edit vehicle
          </Link>
          <Link
            href="/dashboard/vehicles"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
            aria-label="Close"
          >
            <X className="size-5" />
          </Link>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
          {vehicle.photoUrl ? (
            <VehiclePhotoDisplay
              src={vehicle.photoUrl}
              alt=""
              size="full"
              className="mx-auto max-w-md"
            />
          ) : (
            <div className="mx-auto flex aspect-[4/3] max-w-md items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
              No photo
            </div>
          )}

          <section className="space-y-4 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{ymm}</h2>
              <AwardsCountBadge
                count={awardsSection.awards.length}
                showZero
              />
            </div>
            {vehicle.trim ? (
              <p className="text-muted-foreground">{vehicle.trim}</p>
            ) : null}
            {vehicle.nickname ? (
              <p className="text-lg italic text-muted-foreground">
                &quot;{vehicle.nickname}&quot;
              </p>
            ) : null}

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Year</dt>
                <dd className="font-medium">{vehicle.year}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Make</dt>
                <dd className="font-medium">{vehicle.make}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Model</dt>
                <dd className="font-medium">{vehicle.model}</dd>
              </div>
              {vehicle.trim ? (
                <div>
                  <dt className="text-muted-foreground">Trim</dt>
                  <dd className="font-medium">{vehicle.trim}</dd>
                </div>
              ) : null}
              {vinMask ? (
                <div>
                  <dt className="text-muted-foreground">VIN</dt>
                  <dd className="font-mono font-medium">{vinMask}</dd>
                </div>
              ) : null}
            </dl>

            {vehicle.notes?.trim() ? (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Vehicle story
                </h3>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {vehicle.notes}
                </p>
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border bg-muted/20 p-4">
            <VehicleAwardsHistory
              section={awardsSection}
              onRefresh={() => router.refresh()}
            />
          </section>

          <div className="flex flex-wrap gap-2 pb-6">
            <Link
              href="/dashboard/awards"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              My awards &amp; trophies
            </Link>
            <Link
              href="/dashboard/vehicles"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Back to My vehicles
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
