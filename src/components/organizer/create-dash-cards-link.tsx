"use client";

import Link from "next/link";
import { IdCard } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Navigates to the bulk dash card print view for the selected registration ids. */
export function CreateDashCardsLink({
  eventId,
  registrationIds,
  className,
}: {
  eventId: string;
  registrationIds: string[];
  className?: string;
}) {
  const href = `/organizer/events/${eventId}/dash-cards?ids=${registrationIds
    .map((id) => encodeURIComponent(id))
    .join(",")}`;

  return (
    <Link
      href={href}
      prefetch
      className={cn(
        buttonVariants({ variant: "secondary", size: "sm" }),
        "h-8 gap-1 px-2",
        className,
      )}
    >
      <IdCard className="size-4" />
      <span className="hidden sm:inline">Create dash cards</span>
    </Link>
  );
}
