"use client";

import type { RegistrationFeeType } from "@prisma/client";
import { useState } from "react";
import {
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  User,
  Mail,
  Phone,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { ImageLightbox, ThumbnailWithEye } from "@/components/ui/image-lightbox";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { resolveEventCardLogoUrl } from "@/lib/event-card-branding";
import { formatUsdDollars } from "@/lib/money";

export type SidebarEvent = {
  name: string;
  showNumber: number;
  orgName: string | null;
  flyerUrl: string | null;
  logoUrl: string | null;
  /** Hosting club logo when the event has no dedicated logo. */
  orgLogoUrl?: string | null;
  startDate: string;
  /** ISO date for optional weather backup day (`YYYY-MM-DD` display). */
  rainDate?: string | null;
  startTime: string | null;
  endTime: string | null;
  registrationFeeType: RegistrationFeeType | null;
  registrationFeeDollars: number | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  eventWebsite: string | null;
  socialHashtag: string | null;
  /** Who receives in-app messages from logged-in registrants. */
  organizerMessageNote?: string | null;
  sponsorName?: string | null;
  sponsorLogoUrl?: string | null;
  sponsorWebsite?: string | null;
  charityName?: string | null;
  charityDescription?: string | null;
  charityWebsite?: string | null;
  charityEmail?: string | null;
  charityPhone?: string | null;
  charityLogoUrl?: string | null;
};

function feeLabel(type: string | null, dollars: number | null): string {
  if (!type || type === "FREE") return "Free";
  if (type === "DONATION")
    return dollars != null
      ? `${formatUsdDollars(dollars)} suggested donation`
      : "Donation";
  if (type === "PAID_TIERED") return "Tiered pricing";
  return dollars != null ? formatUsdDollars(dollars) : "Paid";
}

function SidebarPartnerBlock({
  title,
  name,
  logoUrl,
  websiteUrl,
}: {
  title: string;
  name?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
}) {
  const displayName = name?.trim() || "";
  const logo = logoUrl?.trim() || "";
  const website = websiteUrl?.trim() || "";

  if (!displayName && !logo) return null;

  const logoAlt = displayName ? `${displayName} logo` : "Logo";
  const logoImage = logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt={logoAlt}
      className="max-h-16 max-w-full rounded border object-contain transition-opacity hover:opacity-90"
    />
  ) : null;

  return (
    <div className="space-y-2 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {logo ? (
        website ? (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
            aria-label={`Visit ${displayName || "website"}`}
          >
            {logoImage}
          </a>
        ) : (
          logoImage
        )
      ) : null}
      {displayName ? <p className="font-medium">{displayName}</p> : null}
    </div>
  );
}

export function EventInfoSidebar({ event }: { event: SidebarEvent }) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const dateStr = new Date(event.startDate).toLocaleDateString(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const rainDateStr = event.rainDate
    ? new Date(event.rainDate).toLocaleDateString(undefined, {
        weekday: "short",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const location = [event.venue, event.city, event.state]
    .filter(Boolean)
    .join(", ");

  const mapsQuery =
    event.lat != null && event.lng != null
      ? `${event.lat},${event.lng}`
      : location;

  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

  const displayLogoUrl = resolveEventCardLogoUrl({
    logoUrl: event.logoUrl,
    orgLogoUrl: event.orgLogoUrl,
  });

  return (
    <>
      <div className="space-y-5">
        {/* Club logo + Club name / Event name + Date & time */}
        <div className="flex gap-3">
          {displayLogoUrl ? (
            <ThumbnailWithEye onClick={() => setLightboxSrc(displayLogoUrl)}>
              <img
                src={displayLogoUrl}
                alt={event.orgName ? `${event.orgName} logo` : "Event logo"}
                className="size-14 shrink-0 rounded-lg border object-contain p-1"
              />
            </ThumbnailWithEye>
          ) : null}
          <div className="min-w-0 flex-1">
            {event.orgName && (
              <p className="text-xs font-medium text-muted-foreground">
                {event.orgName}
              </p>
            )}
            <h2 className="text-base font-bold leading-tight">
              <EventNameWithNumber
                name={event.name}
                showNumber={event.showNumber}
              />
            </h2>
            <div className="mt-1.5 space-y-0.5 text-sm">
              <div className="flex items-center gap-1.5 text-foreground">
                <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="font-medium">{dateStr}</span>
              </div>
              {(event.startTime || event.endTime) && (
                <div className="flex items-center gap-1.5 text-foreground">
                  <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                  <span>
                    {[event.startTime, event.endTime].filter(Boolean).join(" – ")}
                  </span>
                </div>
              )}
              {rainDateStr ? (
                <p className="text-xs text-muted-foreground">
                  Rain date: {rainDateStr}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Fee */}
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="size-4 shrink-0 text-muted-foreground" />
          <span className="font-medium">
            {feeLabel(event.registrationFeeType, event.registrationFeeDollars)}
          </span>
        </div>

        {/* Location */}
        {location && (
          <div className="space-y-1 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p>{location}</p>
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="size-3" />
                  Directions
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        <hr className="border-border" />

        {/* Contact info */}
        <div className="space-y-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Event Contact
          </p>
          {event.contactName && (
            <div className="flex items-center gap-2">
              <User className="size-4 shrink-0 text-muted-foreground" />
              <span>{event.contactName}</span>
            </div>
          )}
          {event.contactEmail && (
            <div className="flex items-center gap-2">
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              <a
                href={`mailto:${event.contactEmail}`}
                className="text-primary hover:underline"
              >
                {event.contactEmail}
              </a>
            </div>
          )}
          {event.contactPhone && (
            <div className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-muted-foreground" />
              <a
                href={`tel:${event.contactPhone}`}
                className="text-primary hover:underline"
              >
                {event.contactPhone}
              </a>
            </div>
          )}
          {event.eventWebsite && (
            <div className="flex items-center gap-2">
              <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
              <a
                href={event.eventWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Event website
              </a>
            </div>
          )}
          {event.socialHashtag && (
            <p className="text-muted-foreground">
              Instagram: {event.socialHashtag}
            </p>
          )}
        </div>
        {event.organizerMessageNote ? (
          <div className="flex gap-2 rounded-lg border border-border/80 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
            <MessageSquare
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden
            />
            <p>{event.organizerMessageNote}</p>
          </div>
        ) : null}

        {(event.sponsorName || event.sponsorLogoUrl) && (
          <>
            <hr className="border-border" />
            <SidebarPartnerBlock
              title="Show Sponsor"
              name={event.sponsorName}
              logoUrl={event.sponsorLogoUrl}
              websiteUrl={event.sponsorWebsite}
            />
          </>
        )}

        {(event.charityName || event.charityLogoUrl) && (
          <>
            <hr className="border-border" />
            <SidebarPartnerBlock
              title="Charity Supported"
              name={event.charityName}
              logoUrl={event.charityLogoUrl}
              websiteUrl={event.charityWebsite}
            />
          </>
        )}
      </div>

      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt="Event image"
          canEdit={false}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </>
  );
}
