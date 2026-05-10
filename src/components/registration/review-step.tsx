"use client";

import { Badge } from "@/components/ui/badge";
import { Car, Tag, CreditCard } from "lucide-react";
import { formatMoney } from "./reg-utils";
import type { TierOption } from "./tier-step";
import type { VehicleOption, NewVehicleRow } from "./vehicle-step";

export function ReviewStep({
  tier,
  selectedVehicles,
  newVehicles,
  eventName,
}: {
  tier: TierOption | undefined;
  selectedVehicles: VehicleOption[];
  newVehicles: NewVehicleRow[];
  eventName: string;
}) {
  const validNew = newVehicles.filter((v) => v.make && v.model && v.year);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Review your registration</h2>
        <p className="text-sm text-muted-foreground">
          Confirm the details below before submitting.
        </p>
      </div>

      {/* Event */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Event
        </p>
        <p className="mt-1 text-base font-semibold">{eventName}</p>
      </div>

      {/* Tier */}
      {tier && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Registration Tier
              </p>
              <p className="mt-1 flex items-center gap-2 font-semibold">
                <Tag className="size-4 text-muted-foreground" />
                {tier.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-muted-foreground" />
              <span className="text-lg font-bold">
                {tier.priceCents === 0 ? "Free" : formatMoney(tier.priceCents)}
              </span>
            </div>
          </div>
          {tier.priceCents > 0 && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              Payment will be collected at a later step. Your registration will be marked as Pending.
            </p>
          )}
        </div>
      )}

      {/* Vehicles */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Vehicles ({selectedVehicles.length + validNew.length})
        </p>
        <ul className="mt-3 space-y-2">
          {selectedVehicles.map((v) => (
            <li key={v.id} className="flex items-center gap-2 text-sm">
              <Car className="size-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">
                {v.year} {v.make} {v.model}
              </span>
              {v.trim && <span className="text-muted-foreground">{v.trim}</span>}
              <Badge variant="muted" className="ml-auto">Garage</Badge>
            </li>
          ))}
          {validNew.map((v, i) => (
            <li key={`new-${i}`} className="flex items-center gap-2 text-sm">
              <Car className="size-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">
                {v.year} {v.make} {v.model}
              </span>
              {v.trim && <span className="text-muted-foreground">{v.trim}</span>}
              <Badge variant="default" className="ml-auto">New</Badge>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
