import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EventCardIdentity } from "@/components/events/event-card-identity";
import { CancelRegistrationButton } from "@/components/dashboard/events/cancel-registration-button";
import { formatEventDateAndTimeRange } from "@/components/dashboard/events/format-event-meta";
import { cn } from "@/lib/utils";
import type { MyRegistrationCard } from "@/lib/dashboard-my-registrations";

export function MyRegistrationCard({ card }: { card: MyRegistrationCard }) {
  const location =
    card.city && card.state
      ? `${card.city}, ${card.state}`
      : card.city || card.state || null;
  const isActive = card.registrationStatus !== "CANCELLED";

  return (
    <li className="rounded-lg border p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <EventCardIdentity
            name={card.eventName}
            showNumber={card.showNumber}
            logoUrl={card.logoUrl}
            orgName={card.orgName}
            orgLogoUrl={card.orgLogoUrl}
            titleClassName="text-base font-semibold"
          />
          <p className="text-sm text-muted-foreground">
            {formatEventDateAndTimeRange(
              new Date(card.startDate),
              card.startTime,
              card.endTime,
            )}
            {location ? ` · ${location}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <p className="text-muted-foreground">
              Tier: <span className="text-foreground">{card.tierName}</span>
            </p>
            <span className="hidden text-muted-foreground sm:inline" aria-hidden>
              ·
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={card.statusVariant}>{card.statusLabel}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Amount paid: </span>
              <span className="font-medium">{card.amountPaid}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Amount due: </span>
              <span
                className={cn(
                  "font-medium",
                  card.hasAmountDue && "text-amber-700 dark:text-amber-300",
                )}
              >
                {card.amountDue}
              </span>
            </p>
          </div>
          {card.vehicles.length > 0 && (
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {card.vehicles.map((v) => (
                <li key={v.id}>
                  {v.publicVehicleId ? (
                    <>
                      <span className="font-mono font-medium text-foreground">
                        {v.publicVehicleId}
                      </span>
                      <span className="text-muted-foreground"> · </span>
                    </>
                  ) : null}
                  {v.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <Link
            href={`/events/${card.eventId}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Event page
          </Link>
          {isActive && (
            <>
              <Link
                href={`/events/${card.eventId}/register/edit`}
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Edit Registration
              </Link>
              <CancelRegistrationButton registrationId={card.id} />
            </>
          )}
        </div>
      </div>
    </li>
  );
}
