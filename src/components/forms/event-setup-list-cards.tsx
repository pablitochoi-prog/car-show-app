"use client";

import Link from "next/link";
import { useState } from "react";
import { Award } from "lucide-react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CompletedBadge,
  NotEnabledBadge,
} from "@/components/ui/completed-badge";
import { EventCategoriesSection } from "@/components/forms/event-categories-section";
import { EventAwardsSection } from "@/components/forms/event-awards-section";
import { EventSponsorSection } from "@/components/forms/event-sponsor-section";
import { EventCharitySection } from "@/components/forms/event-charity-section";
import { EventSmsVotingSettings } from "@/components/sms/event-sms-voting-settings";
import { EventVehicleSaleSettings } from "@/components/sale/event-vehicle-sale-settings";
import type { EventScheduleForSmsDefaults } from "@/lib/sms/default-voting-window";

function sectionTitle(label: string, count: number) {
  return `${label} (${count})`;
}

export function EventSetupListCards({
  eventId,
  initialCategoryCount = 0,
  initialTrophyCount = 0,
  initialSmsVotingStatus = null,
  initialVehicleSaleEnabled = false,
  eventSchedule,
}: {
  eventId: string;
  initialCategoryCount?: number;
  initialTrophyCount?: number;
  initialSmsVotingStatus?: "complete" | "not_enabled" | null;
  initialVehicleSaleEnabled?: boolean;
  eventSchedule: EventScheduleForSmsDefaults;
}) {
  const [categoryCount, setCategoryCount] = useState(initialCategoryCount);
  const [trophyCount, setTrophyCount] = useState(initialTrophyCount);
  const [smsVotingStatus, setSmsVotingStatus] = useState(
    initialSmsVotingStatus,
  );
  const [vehicleSaleEnabled, setVehicleSaleEnabled] = useState(
    initialVehicleSaleEnabled,
  );
  const [sponsorConfigured, setSponsorConfigured] = useState(false);
  const [charityConfigured, setCharityConfigured] = useState(false);

  return (
    <>
      <CollapsibleCard
        title={sectionTitle("Registration Categories", categoryCount)}
        defaultOpen={false}
      >
        <EventCategoriesSection
          eventId={eventId}
          onCountChange={setCategoryCount}
        />
      </CollapsibleCard>
      <CollapsibleCard
        title={sectionTitle("Awards & Trophies", trophyCount)}
        defaultOpen={false}
      >
        <EventAwardsSection eventId={eventId} onCountChange={setTrophyCount} />
      </CollapsibleCard>
      <CollapsibleCard title="Awards & Judging" defaultOpen={false}>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Configure public voting, assigned judge ballot awards, and structured
            score sheet judging for this event.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href={`/organizer/events/${eventId}/awards-judging`}
              className={cn(
                buttonVariants({ variant: "default" }),
                "inline-flex h-11 w-full items-center justify-center gap-2 sm:w-auto",
              )}
            >
              <Award className="size-4" aria-hidden />
              Open Awards &amp; Judging Setup
            </Link>
            <Link
              href={`/organizer/events/${eventId}/awards-judging/score-sheets/results`}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "inline-flex h-11 w-full items-center justify-center gap-2 sm:w-auto",
              )}
            >
              View Score Sheet Results
            </Link>
          </div>
        </div>
      </CollapsibleCard>
      <CollapsibleCard
        title="SMS Voting"
        defaultOpen={false}
        badge={
          smsVotingStatus === "complete" ? (
            <CompletedBadge />
          ) : smsVotingStatus === "not_enabled" ? (
            <NotEnabledBadge />
          ) : undefined
        }
      >
        <EventSmsVotingSettings
          eventId={eventId}
          eventSchedule={eventSchedule}
          onStatusChange={setSmsVotingStatus}
        />
      </CollapsibleCard>
      <CollapsibleCard
        title="Vehicle Sale Inquiries"
        defaultOpen={false}
        badge={vehicleSaleEnabled ? <CompletedBadge /> : undefined}
      >
        <EventVehicleSaleSettings
          eventId={eventId}
          onStatusChange={setVehicleSaleEnabled}
        />
      </CollapsibleCard>
      <CollapsibleCard
        title={
          sponsorConfigured ? "Sponsor Details (configured)" : "Sponsor Details"
        }
        defaultOpen={false}
      >
        <EventSponsorSection
          eventId={eventId}
          onConfiguredChange={setSponsorConfigured}
        />
      </CollapsibleCard>
      <CollapsibleCard
        title={
          charityConfigured
            ? "Charitable Organization (configured)"
            : "Charitable Organization"
        }
        defaultOpen={false}
      >
        <EventCharitySection
          eventId={eventId}
          onConfiguredChange={setCharityConfigured}
        />
      </CollapsibleCard>
    </>
  );
}
