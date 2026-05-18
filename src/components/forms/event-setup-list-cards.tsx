"use client";

import { useState } from "react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { EventCategoriesSection } from "@/components/forms/event-categories-section";
import { EventAwardsSection } from "@/components/forms/event-awards-section";

function sectionTitle(label: string, count: number) {
  return `${label} (${count})`;
}

export function EventSetupListCards({
  eventId,
  initialCategoryCount = 0,
  initialTrophyCount = 0,
}: {
  eventId: string;
  initialCategoryCount?: number;
  initialTrophyCount?: number;
}) {
  const [categoryCount, setCategoryCount] = useState(initialCategoryCount);
  const [trophyCount, setTrophyCount] = useState(initialTrophyCount);

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
    </>
  );
}
