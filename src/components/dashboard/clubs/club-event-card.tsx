"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  DollarSign,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ImageLightbox, ThumbnailWithEye } from "@/components/ui/image-lightbox";
import { cn } from "@/lib/utils";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { formatUsdDollarsAmount } from "@/lib/money";

export type ClubEvent = {
  id: string;
  name: string;
  showNumber: number;
  venue: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  startDate: string;
  startTime: string | null;
  endTime: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  registrationFeeType: string | null;
  registrationFeeDollars: number | null;
  status: string;
  isPast: boolean;
};

function feeLabel(type: string | null, dollars: number | null): string {
  if (!type || type === "FREE") return "Free";
  if (type === "DONATION")
    return dollars != null
      ? `${formatUsdDollarsAmount(dollars)} suggested`
      : "Donation";
  if (type === "PAID_TIERED") return "Tiered pricing";
  if (dollars != null) return formatUsdDollarsAmount(dollars);
  return "Paid";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

function mapThumbnailUrl(lat: number, lng: number): string {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=13&size=150x150&scale=2&markers=color:red%7C${lat},${lng}&key=${MAPS_KEY}`;
}

function mapZoomedUrl(lat: number, lng: number): string {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=14&size=800x600&scale=2&markers=color:red%7C${lat},${lng}&key=${MAPS_KEY}`;
}

export function ClubEventCard({ event }: { event: ClubEvent }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const location = [event.venue, event.city, event.state]
    .filter(Boolean)
    .join(", ");
  const contactParts = [event.contactName].filter(Boolean).join(" ");
  const hasMap = event.lat != null && event.lng != null && MAPS_KEY;

  return (
    <>
    <div
      className={cn(
        "flex gap-4 rounded-lg border p-4 transition-colors",
        event.isPast
          ? "border-muted bg-muted/30 opacity-75"
          : "bg-background hover:border-primary/30",
      )}
    >
      {/* Map thumbnail */}
      {hasMap && (
        <ThumbnailWithEye
          onClick={() => setLightboxOpen(true)}
          className="hidden sm:block"
        >
          <img
            src={mapThumbnailUrl(event.lat!, event.lng!)}
            alt={`Map of ${event.name}`}
            width={120}
            height={120}
            className="h-[120px] w-[120px] rounded-md border object-cover"
            loading="lazy"
          />
        </ThumbnailWithEye>
      )}

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold leading-tight">
              <EventNameWithNumber
                name={event.name}
                showNumber={event.showNumber}
              />
            </h3>
            {event.isPast && (
              <Badge variant="secondary" className="mt-1 text-[10px]">
                Completed
              </Badge>
            )}
          </div>
          {!event.isPast && (
            <Link
              href={`/events/${event.id}/register`}
              className={cn(
                buttonVariants({ size: "sm" }),
                "shrink-0",
              )}
            >
              Register
            </Link>
          )}
        </div>

        <div className="grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
          {location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" />
              {location}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5 shrink-0" />
            {formatDate(event.startDate)}
          </span>
          {(event.startTime || event.endTime) && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5 shrink-0" />
              {[event.startTime, event.endTime].filter(Boolean).join(" – ")}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <DollarSign className="size-3.5 shrink-0" />
            {feeLabel(event.registrationFeeType, event.registrationFeeDollars)}
          </span>
        </div>

        {/* Contact info */}
        {(contactParts || event.contactEmail || event.contactPhone) && (
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {contactParts && (
              <span className="flex items-center gap-1">
                <User className="size-3" />
                {contactParts}
              </span>
            )}
            {event.contactEmail && (
              <a
                href={`mailto:${event.contactEmail}`}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Mail className="size-3" />
                {event.contactEmail}
              </a>
            )}
            {event.contactPhone && (
              <a
                href={`tel:${event.contactPhone}`}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Phone className="size-3" />
                {event.contactPhone}
              </a>
            )}
          </div>
        )}
      </div>
    </div>

    {lightboxOpen && hasMap && (
      <ImageLightbox
        src={mapZoomedUrl(event.lat!, event.lng!)}
        alt={`Map of ${event.name}`}
        canEdit={false}
        onClose={() => setLightboxOpen(false)}
      />
    )}
    </>
  );
}
