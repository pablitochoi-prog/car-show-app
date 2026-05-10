"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Check } from "lucide-react";
import { isTierOpen, formatMoney, formatDate } from "./reg-utils";

export type TierOption = {
  id: string;
  name: string;
  priceCents: number;
  opensAt: string | null;
  closesAt: string | null;
  memberOnly: boolean;
};

export function TierStep({
  tiers,
  selected,
  onSelect,
}: {
  tiers: TierOption[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Choose a registration tier</h2>
        <p className="text-sm text-muted-foreground">
          Select the tier that applies to you. Pricing and availability may vary.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {tiers.map((t) => {
          const open = isTierOpen(t);
          const active = selected === t.id;
          return (
            <button
              key={t.id}
              type="button"
              disabled={!open}
              onClick={() => onSelect(t.id)}
              className={cn(
                "relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                open && !active && "border-border hover:border-primary/40 hover:bg-accent/30",
                active && "border-primary bg-primary/5",
                !open && "cursor-not-allowed border-border bg-muted/50 opacity-60",
              )}
            >
              {active && (
                <div className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" />
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-base font-semibold">{t.name}</span>
                {t.memberOnly && (
                  <Badge variant="secondary" className="gap-1">
                    <Users className="size-3" />
                    Members
                  </Badge>
                )}
              </div>

              <span className="text-2xl font-bold tracking-tight">
                {t.priceCents === 0 ? "Free" : formatMoney(t.priceCents)}
              </span>

              {(t.opensAt || t.closesAt) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3 shrink-0" />
                  {!open ? (
                    <span>
                      {t.opensAt && new Date(t.opensAt) > new Date()
                        ? `Opens ${formatDate(t.opensAt)}`
                        : "Closed"}
                    </span>
                  ) : (
                    <span>
                      {t.closesAt ? `Closes ${formatDate(t.closesAt)}` : "Open now"}
                    </span>
                  )}
                </div>
              )}

              {!open && (
                <Badge variant="muted" className="w-fit">Not available</Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
