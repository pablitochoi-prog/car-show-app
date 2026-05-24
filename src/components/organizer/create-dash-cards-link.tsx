"use client";

import Link from "next/link";
import { IdCard } from "lucide-react";
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
  const label = (
    <>
      <IdCard className="size-4" />
      <span className="hidden sm:inline">Create dash cards</span>
    </>
  );

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
        {label}
      </span>
    );
  }

  const href = `/organizer/events/${eventId}/dash-cards?ids=${registrationIds
    .map((id) => encodeURIComponent(id))
    .join(",")}`;

  return (
    <Link href={href} prefetch className={buttonClass}>
      {label}
    </Link>
  );
}
