"use client";

import { useState } from "react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
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
