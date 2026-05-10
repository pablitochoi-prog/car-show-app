"use client";

import { Trophy } from "lucide-react";

/**
 * Placeholder for the Awards section.
 * Once award-winner tracking is added to the schema (linking EventAward → Vehicle → User),
 * this component will show a sortable table of award-winning vehicles.
 */
export function AdminAwardsSection() {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <Trophy className="size-10 text-muted-foreground/50" />
      <div className="max-w-md space-y-2">
        <h3 className="text-base font-semibold">Award Winners</h3>
        <p className="text-sm text-muted-foreground">
          This section will display all vehicles that have won awards at car shows —
          including Year, Make, Model, VIN, Owner Name, and Awards Won — so you can
          see the most award-winning cars across all events.
        </p>
        <p className="text-xs text-muted-foreground">
          Award-winner tracking will be available once events begin recording results.
          To manage the master list of award category names, see <span className="font-medium">Global Settings → Award Categories</span> below.
        </p>
      </div>
    </div>
  );
}
