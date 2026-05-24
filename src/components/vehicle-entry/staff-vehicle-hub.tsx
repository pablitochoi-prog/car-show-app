import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { VehicleEntryHeader } from "@/components/vehicle-entry/vehicle-entry-header";
import { cn } from "@/lib/utils";
import type { VehicleEntryRecord } from "@/lib/vehicle-entry-types";

type Props = {
  entry: VehicleEntryRecord;
  canJudge: boolean;
};

export function StaffVehicleHub({ entry, canJudge }: Props) {
  const code = encodeURIComponent(entry.vehicleEntryCode);
  const base = `/v/${code}`;

  const linkClass = (variant: "default" | "secondary" | "outline" | "ghost") =>
    cn(
      buttonVariants({ variant }),
      "w-full justify-start no-underline",
    );

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <VehicleEntryHeader
        entry={entry}
        subtitle="Event staff — choose an action for this vehicle entry."
      />

      <nav className="flex flex-col gap-3">
        <Link href={`${base}?view=public`} className={linkClass("default")}>
          Public voting page
        </Link>
        {canJudge ? (
          <Link href={`${base}?view=judge`} className={linkClass("secondary")}>
            Judge scoring
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">
            Judge scoring requires the Judge role on this event.
          </p>
        )}
        <Link
          href={`/organizer/events/${entry.eventId}/registrations/${entry.registrationId}`}
          className={linkClass("outline")}
        >
          Registration &amp; check-in
        </Link>
        <Link
          href={`/organizer/events/${entry.eventId}/registrations`}
          className={linkClass("outline")}
        >
          All registrations
        </Link>
        <Link href={`/events/${entry.eventId}`} className={linkClass("ghost")}>
          Event page
        </Link>
      </nav>
    </div>
  );
}
