import type { ReactNode } from "react";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { EventLogo } from "@/components/events/event-logo";
import {
  resolveEventCardLogoAlt,
  resolveEventCardLogoUrl,
} from "@/lib/event-card-branding";
import { cn } from "@/lib/utils";

export type EventCardIdentityProps = {
  name: string;
  showNumber: number;
  logoUrl?: string | null;
  orgName?: string | null;
  orgLogoUrl?: string | null;
  /** Badges rendered below the club line (e.g. Registered, Exhibitor). */
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
  const imageSrc = resolveEventCardLogoUrl({ logoUrl, orgLogoUrl });
  const imageAlt = resolveEventCardLogoAlt({ name, orgName: club });

  return (
    <div className={cn("flex gap-3", className)}>
      <EventLogo src={imageSrc} alt={imageAlt} size="md" />
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
          <p className="text-sm text-muted-foreground">
            Hosted by{" "}
            <span className="font-medium text-foreground">{club}</span>
          </p>
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
