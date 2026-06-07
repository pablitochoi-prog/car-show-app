"use client";

import { IdCard } from "lucide-react";
import { PendingLink, PendingNavSpinner, usePendingNav } from "@/components/navigation/pending-navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Navigates to the bulk dash card print view for the selected registration ids. */
export function CreateDashCardsLink({
  eventId,
  registrationIds,
  registrationVehicleIds,
  disabled = false,
  disabledTitle,
  className,
}: {
  eventId: string;
  registrationIds: string[];
  /** When set, only dash cards for these linked vehicles are printed. */
  registrationVehicleIds?: string[];
  disabled?: boolean;
  disabledTitle?: string;
  className?: string;
}) {
  const buttonClass = cn(
    buttonVariants({ variant: "secondary", size: "sm" }),
    "h-8 gap-1 px-2",
    className,
  );

  if (disabled) {
    return (
      <span
        title={disabledTitle}
        aria-disabled="true"
        className={cn(buttonClass, "cursor-not-allowed opacity-50")}
      >
        <IdCard className="size-4" />
        <span className="hidden sm:inline">Create dash cards</span>
      </span>
    );
  }

  const params = new URLSearchParams();
  if (registrationIds.length > 0) {
    params.set("ids", registrationIds.join(","));
  }
  if (registrationVehicleIds && registrationVehicleIds.length > 0) {
    params.set("rvIds", registrationVehicleIds.join(","));
  }
  const href = `/organizer/events/${eventId}/dash-cards?${params.toString()}`;

  return (
    <PendingLink href={href} prefetch className={buttonClass}>
      <DashCardsLinkLabel />
    </PendingLink>
  );
}

function DashCardsLinkLabel() {
  const navigating = usePendingNav();

  return (
    <>
      {navigating ? (
        <PendingNavSpinner className="size-4" />
      ) : (
        <IdCard className="size-4" />
      )}
      <span className="hidden sm:inline">
        {navigating ? "Loading…" : "Create dash cards"}
      </span>
    </>
  );
}
