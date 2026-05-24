import type { ReactNode } from "react";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { EventLogo } from "@/components/events/event-logo";
import { cn } from "@/lib/utils";

/** Left indent for date/location row under the event logo + title block. */
export const EVENT_CARD_META_INDENT_CLASS = "sm:ml-[5.25rem]";

export type EventCardIdentityProps = {
  name: string;
  showNumber: number;
  logoUrl?: string | null;
  orgName?: string | null;
  orgLogoUrl?: string | null;
  /** Badges rendered below the hosting club line (e.g. Organizer). */
  badges?: ReactNode;
  titleClassName?: string;
  className?: string;
};

export function EventCardIdentity({
  name,
  showNumber,
  logoUrl,
  orgName,
  orgLogoUrl,
  badges,
  titleClassName,
  className,
}: EventCardIdentityProps) {
  const club = orgName?.trim();
  const eventLogoSrc = logoUrl?.trim() || null;
  const clubLogoSrc = orgLogoUrl?.trim() || null;
  const clubAlt = club ? `${club} logo` : "Club logo";
  const eventAlt = `${name.trim()} event logo`;

  const showEvent = Boolean(eventLogoSrc);
  const showClub = Boolean(clubLogoSrc);
  const showEventPlaceholder = !showEvent;

  return (
    <div className={cn("flex gap-3", className)}>
      {showEvent ? (
        <EventLogo
          src={eventLogoSrc}
          alt={eventAlt}
          size="md"
          shape="wide"
          className="self-start"
        />
      ) : showEventPlaceholder ? (
        <EventLogo
          src={null}
          alt={name}
          size="md"
          shape="wide"
          className="self-start"
        />
      ) : null}

      <div className="min-w-0 flex-1 space-y-0.5">
        <p
          className={cn(
            "text-base font-semibold leading-snug tracking-tight",
            titleClassName,
          )}
        >
          <EventNameWithNumber name={name} showNumber={showNumber} />
        </p>
        {club ? (
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
            <span>Hosted by</span>
            <span className="font-medium text-foreground">{club}</span>
            {showClub ? (
              <EventLogo
                src={clubLogoSrc}
                alt={clubAlt}
                size="club"
                shape="square"
                className="shrink-0"
                title={club ? `Hosting club: ${club}` : undefined}
              />
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Independent event</p>
        )}
        {badges ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {badges}
          </div>
        ) : null}
      </div>
    </div>
  );
}
