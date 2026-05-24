"use client";

import { useState } from "react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { CompletedBadge } from "@/components/ui/completed-badge";
import { EventCategoriesSection } from "@/components/forms/event-categories-section";
import { EventAwardsSection } from "@/components/forms/event-awards-section";
import { EventSponsorSection } from "@/components/forms/event-sponsor-section";
import { EventCharitySection } from "@/components/forms/event-charity-section";
import { EventSmsVotingSettings } from "@/components/sms/event-sms-voting-settings";
import type { EventScheduleForSmsDefaults } from "@/lib/sms/default-voting-window";

function sectionTitle(label: string, count: number) {
  return `${label} (${count})`;
}

export function EventSetupListCards({
  eventId,
  initialCategoryCount = 0,
  initialTrophyCount = 0,
  initialSmsVotingComplete = false,
  eventSchedule,
}: {
  eventId: string;
  initialCategoryCount?: number;
  initialTrophyCount?: number;
  initialSmsVotingComplete?: boolean;
  eventSchedule: EventScheduleForSmsDefaults;
}) {
  const [categoryCount, setCategoryCount] = useState(initialCategoryCount);
  const [trophyCount, setTrophyCount] = useState(initialTrophyCount);
  const [smsVotingComplete, setSmsVotingComplete] = useState(
    initialSmsVotingComplete,
  );
  const [sponsorConfigured, setSponsorConfigured] = useState(false);
  const [charityConfigured, setCharityConfigured] = useState(false);

  return (
    <>
      <CollapsibleCard
        title={sectionTitle("Registration Categories", categoryCount)}
        defaultOpen={false}
        keepMounted
      >
        <EventCategoriesSection
          eventId={eventId}
          onCountChange={setCategoryCount}
        />
      </CollapsibleCard>
      <CollapsibleCard
        title={sectionTitle("Awards & Trophies", trophyCount)}
        defaultOpen={false}
        keepMounted
      >
        <EventAwardsSection eventId={eventId} onCountChange={setTrophyCount} />
      </CollapsibleCard>
      <CollapsibleCard
        title="SMS Voting"
        defaultOpen={false}
        keepMounted
        badge={smsVotingComplete ? <CompletedBadge /> : undefined}
      >
        <EventSmsVotingSettings
          eventId={eventId}
          eventSchedule={eventSchedule}
          onCompleteChange={setSmsVotingComplete}
        />
      </CollapsibleCard>
      <CollapsibleCard
        title={
          sponsorConfigured ? "Sponsor Details (configured)" : "Sponsor Details"
        }
        defaultOpen={false}
        keepMounted
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
        keepMounted
      >
        <EventCharitySection
          eventId={eventId}
          onConfiguredChange={setCharityConfigured}
        />
      </CollapsibleCard>
    </>
  );
}
