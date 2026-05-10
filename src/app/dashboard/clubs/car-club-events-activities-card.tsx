"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CarClubUpcomingActivities } from "./new/car-club-upcoming-activities";

export function CarClubEventsActivitiesCard({
  organizationId,
}: {
  organizationId: string;
}) {
  const newEventHref = `/organizer/events/new?orgId=${encodeURIComponent(organizationId)}`;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="min-w-0 space-y-1.5">
          <CardTitle>Events / Activities</CardTitle>
          <CardDescription>
            Upcoming events hosted under this club. Create a new event with this
            club pre-selected as host.
          </CardDescription>
        </div>
        <Link
          href={newEventHref}
          className={cn(
            buttonVariants({ variant: "default" }),
            "w-full shrink-0 sm:w-auto"
          )}
        >
          Add new event
        </Link>
      </CardHeader>
      <CardContent className="pt-6">
        <CarClubUpcomingActivities
          organizationId={organizationId}
          embedded
        />
      </CardContent>
    </Card>
  );
}
