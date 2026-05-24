import type { ReactNode } from "react";
import Image from "next/image";
import {
  Building2,
  Calendar,
  Car,
  MapPin,
  Trophy,
  User,
} from "lucide-react";
import type { DashCardModel, DashCardSponsorModel } from "@/lib/dash-card-types";
import { cn } from "@/lib/utils";
import { DashCardQrPlaceholder } from "@/components/dash-card/dash-card-qr-placeholder";

function vehicleTitle(v: DashCardModel["vehicle"]): string {
  const t = v.trim?.trim();
  const yearPart =
    typeof v.year === "number" && v.year > 0 ? v.year : null;
  return [yearPart, v.make, v.model, t].filter(Boolean).join(" ");
}

function ShowLogoBadge({ event }: Pick<DashCardModel, "event">) {
  const label =
    event.hostOrganizationName?.trim() || event.showName;
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (event.logoUrl) {
    return (
      <div className="dash-card-logo relative size-14 shrink-0 overflow-hidden rounded-full border-2 border-[#142047] bg-white sm:size-16">
        <Image
          src={event.logoUrl}
          alt={`${event.showName} logo`}
          fill
          className="object-cover"
          sizes="64px"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className="dash-card-logo flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-[#142047] bg-[#f1f5f9] text-center sm:size-16"
      aria-hidden
    >
      <span className="px-1 text-[0.65rem] font-bold leading-tight text-[#142047] sm:text-xs">
        {initials || "SHOW"}
      </span>
    </div>
  );
}

function StaffPhoto({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  if (src.startsWith("/api/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn("h-full w-full object-cover object-center", className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={cn("object-cover object-center", className)}
      sizes="6.5in"
      unoptimized
    />
  );
}

function VehiclePhoto({
  vehicle,
}: {
  vehicle: DashCardModel["vehicle"];
}) {
  if (vehicle.vehiclePhotoUrl) {
    return (
      <div className="dash-card-vehicle-photo relative shrink-0 overflow-hidden rounded-md border border-[#cbd5e1] bg-[#f8fafc]">
        <StaffPhoto
          src={vehicle.vehiclePhotoUrl}
          alt={`${vehicleTitle(vehicle)} at show`}
        />
      </div>
    );
  }

  return (
    <div
      className="dash-card-vehicle-photo flex shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[#94a3b8] bg-gradient-to-br from-[#f1f5f9] to-[#e2e8f0] text-[#64748b]"
      aria-hidden
    >
      <Car className="size-10 sm:size-12" strokeWidth={1.25} />
      <span className="dash-card-field-label text-center font-medium uppercase tracking-wide">
        Vehicle photo
      </span>
    </div>
  );
}

function SidebarInfoRow({
  icon: Icon,
  iconSlot,
  label,
  value,
  valueClassName,
}: {
  icon?: typeof Trophy;
  iconSlot?: ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="dash-card-sidebar-row flex gap-2.5">
      {iconSlot ?? (
        <div
          className="dash-card-sidebar-icon flex size-9 shrink-0 items-center justify-center rounded-full bg-[#142047] text-white sm:size-10"
          aria-hidden
        >
          {Icon ? (
            <Icon className="size-4 sm:size-[1.1rem]" strokeWidth={2} />
          ) : null}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="dash-card-field-label font-bold uppercase tracking-wider text-[#64748b]">
          {label}
        </p>
        <p
          className={cn(
            "dash-card-sidebar-value dash-card-field-value mt-0.5 text-base font-bold leading-snug text-[#142047] sm:text-lg",
            valueClassName,
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function VehicleIdPanel({ publicVehicleId }: { publicVehicleId: string | null }) {
  return (
    <div className="dash-card-id-panel rounded-md border border-[#cbd5e1] bg-white shadow-sm">
      <div className="bg-[#142047] px-2 py-1.5 text-center text-xs font-bold uppercase tracking-wider text-white sm:text-sm">
        Vehicle ID
      </div>
      <div className="dash-card-id-panel-body flex items-center justify-center px-2 text-center sm:px-3">
        {publicVehicleId ? (
          <p className="dash-card-vehicle-id-value dash-card-sidebar-value font-mono font-bold uppercase leading-normal text-[#b91c1c]">
            {publicVehicleId}
          </p>
        ) : (
          <p className="dash-card-sidebar-value font-semibold uppercase leading-normal text-[#64748b]">
            ID pending
          </p>
        )}
      </div>
    </div>
  );
}

function OwnerSidebarRow({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl?: string | null;
}) {
  const photoIcon = photoUrl ? (
    <div
      className="dash-card-sidebar-icon relative size-9 shrink-0 overflow-hidden rounded-full border-2 border-[#142047] bg-[#f1f5f9] sm:size-10"
      aria-hidden
    >
      <StaffPhoto src={photoUrl} alt={`${name} profile`} className="rounded-full" />
    </div>
  ) : undefined;

  return (
    <SidebarInfoRow
      icon={User}
      iconSlot={photoIcon}
      label="Owner"
      value={name}
      valueClassName="dash-card-owner-name"
    />
  );
}

function DashCardSponsorLogo({
  sponsor,
  side,
}: {
  sponsor: DashCardSponsorModel;
  side: "event" | "site";
}) {
  const logo = sponsor.logoUrl?.trim() || "";
  const name = sponsor.name?.trim() || "";
  const href = sponsor.websiteUrl?.trim() || "";
  const fallbackLabel = side === "event" ? "Event sponsor" : "Site sponsor";
  const label = name || fallbackLabel;

  const slotClass = cn(
    "dash-card-sponsor-logo-slot",
    side === "event"
      ? "dash-card-sponsor-logo-slot--left"
      : "dash-card-sponsor-logo-slot--right",
  );

  if (!logo && !name) {
    return (
      <div className={slotClass}>
        <span className="text-[0.65rem] font-medium uppercase tracking-wide text-[#94a3b8]">
          {fallbackLabel}
        </span>
      </div>
    );
  }

  const image = logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt={`${label} logo`}
      className="dash-card-sponsor-logo-image"
    />
  ) : (
    <span className="text-sm font-semibold text-[#142047]">{label}</span>
  );

  if (logo && href) {
    return (
      <div className={slotClass}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Visit ${label}`}
          className="inline-flex max-w-full items-center"
        >
          {image}
        </a>
      </div>
    );
  }

  return <div className={slotClass}>{image}</div>;
}

function SponsorshipBlock({
  eventSponsor,
  siteSponsor,
}: {
  eventSponsor: DashCardSponsorModel;
  siteSponsor: DashCardSponsorModel;
}) {
  const hasEventLogo = Boolean(eventSponsor.logoUrl?.trim());

  return (
    <div className="dash-card-sponsor mt-auto shrink-0 pt-2">
      <p className="dash-card-field-label font-bold uppercase tracking-wide text-[#142047]">
        Show sponsored by:
      </p>
      <div
        className={cn(
          "dash-card-sponsor-logo mt-1 rounded border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-2",
          !hasEventLogo && "dash-card-sponsor-logo--site-only-left",
        )}
      >
        {hasEventLogo ? (
          <DashCardSponsorLogo sponsor={eventSponsor} side="event" />
        ) : null}
        <DashCardSponsorLogo
          sponsor={siteSponsor}
          side={hasEventLogo ? "site" : "event"}
        />
      </div>
    </div>
  );
}

function VotePanel({
  voting,
  className,
}: {
  voting: DashCardModel["voting"];
  className?: string;
}) {
  const vehicleId = voting.vehicleIdForSms?.trim() ?? "";

  return (
    <aside
      className={cn(
        "dash-card-vote flex h-full min-h-0 w-full flex-col overflow-hidden rounded-md border border-[#cbd5e1] bg-white shadow-sm",
        className,
      )}
    >
      <div className="shrink-0 bg-[#142047] py-1.5 text-center text-xs font-bold uppercase tracking-wider text-white sm:text-sm">
        Vote / judge here
      </div>
      <div className="dash-card-vote-inner flex min-h-0 flex-1 flex-col pb-2 pt-1 sm:pb-2.5 sm:pt-1.5">
        <div className="dash-card-vote-sms-block w-full shrink-0 space-y-0.5 px-2 sm:px-2.5">
          {vehicleId ? (
            <p className="dash-card-vote-text dash-card-vote-instruction text-center text-[#334155]">
              Text{" "}
              <strong className="font-mono font-bold text-[#b91c1c]">
                {vehicleId}
              </strong>{" "}
              to{" "}
              <strong className="font-mono font-bold text-[#b91c1c]">
                {voting.smsShortCode}
              </strong>
            </p>
          ) : (
            <p className="dash-card-vote-text text-center text-[#334155]">
              SMS voting requires a vehicle ID on this card.
            </p>
          )}
          <p className="dash-card-rates-disclaimer text-center text-[0.625rem] leading-tight text-[#64748b] sm:text-[0.6875rem]">
            Standard message rates apply.
          </p>
        </div>
        <div className="dash-card-qr-row-center py-1">
          <div className="dash-card-qr-stage">
            <span className="dash-card-qr-side-label dash-card-qr-side-label--left" aria-hidden>
              Scan to vote
            </span>
            <div className="dash-card-qr-wrap">
              {voting.qrImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={voting.qrImageUrl} alt="Scan to vote" />
              ) : (
                <DashCardQrPlaceholder />
              )}
            </div>
            <span className="dash-card-qr-side-label dash-card-qr-side-label--right" aria-hidden>
              Scan to vote
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function DashCardPreview({ data }: { data: DashCardModel }) {
  const { event, vehicle, owner, voting, siteSponsor } = data;
  const vehicleNickname = vehicle.nickname?.trim() ?? "";
  const eventDateLine = [
    event.dateRangeLabel,
    event.timeLabel ? event.timeLabel : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className={cn(
        "dash-card-sheet mx-auto box-border flex h-full max-w-5xl flex-col bg-white text-[#0f172a] shadow-lg",
        "border border-[#e2e8f0] print:max-w-none print:shadow-none print:border-0",
      )}
    >
      <header className="dash-card-header flex shrink-0 items-start gap-2 border-b border-[#e2e8f0] px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
        <ShowLogoBadge event={event} />
        <div className="dash-card-header-main min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h1 className="dash-card-header-title min-w-0 truncate text-base font-extrabold uppercase leading-tight tracking-tight text-[#142047] sm:text-lg">
              {event.showName}
            </h1>
            <p className="dash-card-header-meta shrink-0 text-right text-sm font-medium leading-snug text-[#334155]">
              <Calendar
                className="mr-0.5 inline size-3.5 shrink-0 text-[#b91c1c] align-text-bottom"
                aria-hidden
              />
              {eventDateLine}
            </p>
          </div>
          <div className="mt-0.5 flex items-start justify-between gap-3">
            {event.hostOrganizationName ? (
              <p className="dash-card-header-host min-w-0 flex items-center gap-1 text-sm font-semibold text-[#334155]">
                <Building2
                  className="size-3.5 shrink-0 text-[#b91c1c]"
                  aria-hidden
                />
                <span className="truncate">
                  Hosted by{" "}
                  <span className="text-[#142047]">
                    {event.hostOrganizationName}
                  </span>
                </span>
              </p>
            ) : (
              <span />
            )}
            <p className="dash-card-header-meta shrink-0 text-right text-sm font-medium leading-snug text-[#334155]">
              <MapPin
                className="mr-0.5 inline size-3.5 shrink-0 text-[#b91c1c] align-text-bottom"
                aria-hidden
              />
              {event.venue}
            </p>
          </div>
        </div>
      </header>

      <div className="dash-card-ymm-band shrink-0 border-b-2 border-[#142047] bg-[#f8fafc] px-3 py-2 text-center sm:px-4 sm:py-2.5">
        <p className="dash-card-ymm font-extrabold uppercase leading-tight tracking-tight text-[#0f172a]">
          {vehicleTitle(vehicle)}
        </p>
        {vehicleNickname ? (
          <p className="dash-card-nickname-row dash-card-nickname mt-1 font-medium italic text-[#b91c1c]">
            &ldquo;{vehicleNickname}&rdquo;
          </p>
        ) : null}
      </div>

      <div className="dash-card-content dash-card-body-grid min-h-0 flex-1">
        <aside className="dash-card-col-sidebar flex min-h-0 flex-col gap-3 border-r border-[#e2e8f0] p-2 sm:gap-3.5 sm:p-2.5">
          <VehicleIdPanel publicVehicleId={vehicle.publicVehicleId} />
          <SidebarInfoRow
            icon={Trophy}
            label="Vehicle Class"
            value={vehicle.classLabel}
            valueClassName="dash-card-class-value"
          />
          <OwnerSidebarRow
            name={owner.name}
            photoUrl={owner.ownerPhotoUrl}
          />
          <SidebarInfoRow
            icon={MapPin}
            label="Location"
            value={owner.cityState || "—"}
            valueClassName="dash-card-owner-city"
          />
          <SponsorshipBlock
            eventSponsor={{
              logoUrl: event.sponsorLogoUrl,
              websiteUrl: event.sponsorWebsiteUrl,
              name: event.sponsorName,
            }}
            siteSponsor={siteSponsor}
          />
        </aside>

        <div className="dash-card-photo-span flex p-2 sm:p-2.5">
          <VehiclePhoto vehicle={vehicle} />
        </div>

        <section className="dash-card-col-story flex min-h-0 flex-col overflow-hidden border-r border-[#e2e8f0] p-2 sm:p-2.5">
          <h2 className="dash-card-story-label dash-card-field-label mb-1 font-bold uppercase tracking-wider text-[#64748b]">
            Vehicle story
          </h2>
          <p className="dash-card-story-text dash-card-field-value min-h-0 flex-1 text-pretty text-base leading-snug text-[#334155]">
            {data.vehicleStory}
          </p>
        </section>

        <div className="dash-card-col-vote flex min-h-0 flex-col p-2 sm:p-2.5">
          <VotePanel voting={voting} className="h-full min-h-0" />
        </div>
      </div>

      <footer className="dash-card-footer shrink-0 border-t-2 border-[#142047] px-2 py-1 sm:px-3">
        <div className="dash-card-footer-inner grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <span aria-hidden />
          <p className="flex flex-wrap items-center justify-center gap-1.5 text-center text-[0.55rem] font-bold uppercase tracking-[0.1em] text-[#142047] sm:text-[0.6rem]">
            <span className="text-[#b91c1c]" aria-hidden>
              ★★★
            </span>
            Thank you for supporting the classic car community
            <span className="text-[#b91c1c]" aria-hidden>
              ★★★
            </span>
          </p>
          <div className="dash-card-footer-brand flex items-center justify-end gap-1.5 justify-self-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/carshowscout-mark.png"
              alt=""
              className="dash-card-footer-logo"
            />
            <span className="dash-card-footer-copyright whitespace-nowrap text-[#64748b]">
              &copy; {new Date().getFullYear()} CarShowScout.com
            </span>
          </div>
        </div>
      </footer>
    </article>
  );
}
