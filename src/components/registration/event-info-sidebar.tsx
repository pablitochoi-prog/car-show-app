"use client";

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

export type SidebarEvent = {
  name: string;
  showNumber: number;
  orgName: string | null;
  flyerUrl: string | null;
  logoUrl: string | null;
  startDate: string;
  startTime: string | null;
  endTime: string | null;
  registrationFeeType: string | null;
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
};

function feeLabel(type: string | null, dollars: number | null): string {
  if (!type || type === "FREE") return "Free";
  if (type === "DONATION")
    return dollars != null ? `${dollars} suggested donation` : "Donation";
  if (type === "PAID_TIERED") return "Tiered pricing";
  return dollars != null ? String(dollars) : "Paid";
}

export function EventInfoSidebar({ event }: { event: SidebarEvent }) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const dateStr = new Date(event.startDate).toLocaleDateString(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const location = [event.venue, event.city, event.state]
    .filter(Boolean)
    .join(", ");

  const mapsQuery =
    event.lat != null && event.lng != null
      ? `${event.lat},${event.lng}`
      : location;

  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

  return (
    <>
      <div className="space-y-5">
        {/* Club logo + Club name / Event name + Date & time */}
        <div className="flex gap-3">
          {event.logoUrl && (
            <ThumbnailWithEye onClick={() => setLightboxSrc(event.logoUrl)}>
              <img
                src={event.logoUrl}
                alt="Club logo"
                className="size-14 shrink-0 rounded-lg border object-contain p-1"
              />
            </ThumbnailWithEye>
          )}
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
