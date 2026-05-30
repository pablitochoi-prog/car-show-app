"use client";

import { IdCard } from "lucide-react";
import { PendingLink, PendingNavSpinner, usePendingNav } from "@/components/navigation/pending-navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Navigates to the bulk dash card print view for the selected registration ids. */
export function CreateDashCardsLink({
  eventId,
  registrationIds,
  disabled = false,
  disabledTitle,
  className,
}: {
  eventId: string;
  registrationIds: string[];
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

  const href = `/organizer/events/${eventId}/dash-cards?ids=${registrationIds
    .map((id) => encodeURIComponent(id))
    .join(",")}`;

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
