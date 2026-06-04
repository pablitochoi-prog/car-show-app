"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { VehiclePhotoDisplay } from "@/components/vehicle/vehicle-photo-display";
import { AwardsCountBadge } from "@/components/dashboard/awards-count-badge";
import { VehicleAwardsHistory } from "@/components/dashboard/vehicle-awards-history";
import type { MyGarageVehicleAwardsSection } from "@/lib/my-vehicle-awards";

function VehicleSection({
  section,
  onRefresh,
}: {
  section: MyGarageVehicleAwardsSection;
  onRefresh: () => void;
}) {
  const ymm = [section.year, section.make, section.model]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-start gap-3">
        {section.photoUrl ? (
          <VehiclePhotoDisplay
            src={section.photoUrl}
            alt=""
            size="thumb"
            className="w-20 shrink-0"
          />
        ) : (
          <div
            className="flex size-20 shrink-0 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground"
            aria-hidden
          >
            No photo
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold leading-tight">
              <Link
                href={`/dashboard/vehicles/${section.vehicleId}`}
                className="hover:text-primary hover:underline"
              >
                {ymm}
              </Link>
            </h2>
            <AwardsCountBadge count={section.awards.length} showZero />
          </div>
          {section.trim ? (
            <p className="text-sm text-muted-foreground">{section.trim}</p>
          ) : null}
          {section.nickname ? (
            <p className="text-sm italic text-muted-foreground">
              &quot;{section.nickname}&quot;
            </p>
          ) : null}
        </div>
      </div>

      <VehicleAwardsHistory section={section} onRefresh={onRefresh} />
    </section>
  );
}

export function MyAwardsGarage({
  sections,
  totalAwards,
}: {
  sections: MyGarageVehicleAwardsSection[];
  totalAwards: number;
}) {
  const router = useRouter();

  function refresh() {
    router.refresh();
  }

  if (sections.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
        Add vehicles in{" "}
        <a href="/dashboard/vehicles" className="text-primary underline">
          My Vehicles
        </a>{" "}
        to track awards from shows you enter.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {sections.map((section) => (
          <VehicleSection
            key={section.vehicleId}
            section={section}
            onRefresh={refresh}
          />
        ))}
      </div>

      {totalAwards > 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          {totalAwards} total award{totalAwards === 1 ? "" : "s"} across your
          garage
        </p>
      ) : null}
    </div>
  );
}
