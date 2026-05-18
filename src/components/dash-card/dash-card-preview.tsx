import Image from "next/image";
import {
  Building2,
  Calendar,
  Car,
  MapPin,
  Trophy,
  User,
} from "lucide-react";
import type { DashCardModel } from "@/lib/dash-card-types";
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

function VehiclePhoto({
  vehicle,
}: {
  vehicle: DashCardModel["vehicle"];
}) {
  if (vehicle.vehiclePhotoUrl) {
    return (
      <div className="dash-card-vehicle-photo relative shrink-0 overflow-hidden rounded-md border border-[#cbd5e1] bg-[#f8fafc]">
        <Image
          src={vehicle.vehiclePhotoUrl}
          alt={`${vehicleTitle(vehicle)} at show`}
          fill
          className="object-cover object-center"
          sizes="6.5in"
          unoptimized
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
  label,
  value,
  valueClassName,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="dash-card-sidebar-row flex gap-2.5">
      <div
        className="dash-card-sidebar-icon flex size-9 shrink-0 items-center justify-center rounded-full bg-[#142047] text-white sm:size-10"
        aria-hidden
      >
        <Icon className="size-4 sm:size-[1.1rem]" strokeWidth={2} />
      </div>
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
    <div className="dash-card-id-panel overflow-hidden rounded-md border border-[#cbd5e1] bg-white shadow-sm">
      <div className="bg-[#142047] px-2 py-1.5 text-center text-xs font-bold uppercase tracking-wider text-white sm:text-sm">
        Vehicle ID
      </div>
      <div className="px-2 py-2 text-center sm:px-3 sm:py-2.5">
        {publicVehicleId ? (
          <p className="dash-card-vehicle-id-value dash-card-sidebar-value font-mono text-base font-bold uppercase leading-snug text-[#b91c1c] sm:text-lg">
            {publicVehicleId}
          </p>
        ) : (
          <p className="dash-card-sidebar-value font-semibold uppercase leading-snug text-[#64748b]">
            ID pending
          </p>
        )}
      </div>
    </div>
  );
}

function SponsorshipBlock({ logoUrl }: { logoUrl?: string | null }) {
  return (
    <div className="dash-card-sponsor mt-auto shrink-0 pt-2">
      <p className="dash-card-field-label font-bold uppercase tracking-wide text-[#142047]">
        Show sponsored by:
      </p>
      <div className="dash-card-sponsor-logo mt-1 flex items-center justify-start rounded border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-2 py-2">
        {logoUrl ? (
          <div className="dash-card-sponsor-logo-img relative w-full">
            <Image
              src={logoUrl}
              alt="Show sponsor"
              fill
              className="object-contain object-left"
              unoptimized
            />
          </div>
        ) : (
          <span className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">
            Sponsor logo
          </span>
        )}
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
      <div className="dash-card-vote-inner flex min-h-0 flex-1 flex-col justify-between gap-2 p-2.5 sm:p-3">
        <div className="w-full space-y-1.5">
          {voting.vehicleIdForSms ? (
            <p className="dash-card-vote-text text-center text-base leading-snug text-[#334155] sm:text-lg">
              Text{" "}
              <strong className="font-mono font-bold text-[#b91c1c]">
                {voting.vehicleIdForSms}
              </strong>{" "}
              to{" "}
              <strong className="font-mono font-bold text-[#b91c1c]">
                {voting.smsShortCode}
              </strong>
            </p>
          ) : (
            <p className="dash-card-vote-text text-center text-base leading-snug text-[#334155] sm:text-lg">
              SMS voting requires a vehicle ID on this card.
            </p>
          )}
          {voting.ratesDisclaimer ? (
            <p className="text-center text-xs text-[#64748b] sm:text-sm">
              {voting.ratesDisclaimer}
            </p>
          ) : null}
          <p className="text-center text-xs font-bold uppercase text-[#64748b] sm:text-sm">
            or scan
          </p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5 py-1">
          <div className="dash-card-qr-wrap w-full max-w-[5.5rem] sm:max-w-[6.5rem]">
            {voting.qrImageUrl ? (
              <div className="relative aspect-square w-full">
                <Image
                  src={voting.qrImageUrl}
                  alt=""
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <DashCardQrPlaceholder label="QR" />
            )}
          </div>
          <p className="dash-card-vote-text text-center text-xs font-semibold uppercase tracking-wide text-[#142047] sm:text-sm">
            {voting.qrSectionTitle}
          </p>
        </div>
      </div>
    </aside>
  );
}

export function DashCardPreview({ data }: { data: DashCardModel }) {
  const { event, vehicle, owner, voting } = data;
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
        <p className="dash-card-nickname-row dash-card-nickname mt-1 border-t border-[#cbd5e1] pt-1.5 italic text-[#b91c1c]">
          Vehicle Nickname:{" "}
          {vehicle.nickname?.trim() ? `“${vehicle.nickname.trim()}”` : "—"}
        </p>
      </div>

      <div className="dash-card-content dash-card-body-grid min-h-0 flex-1">
        <aside className="dash-card-col-sidebar flex min-h-0 flex-col gap-3 border-r border-[#e2e8f0] p-2 sm:gap-3.5 sm:p-2.5">
          <VehicleIdPanel publicVehicleId={vehicle.publicVehicleId} />
          <SidebarInfoRow
            icon={Trophy}
            label="Class"
            value={vehicle.classLabel}
            valueClassName="dash-card-class-value"
          />
          <SidebarInfoRow
            icon={User}
            label="Owner"
            value={owner.name}
            valueClassName="dash-card-owner-name"
          />
          <SidebarInfoRow
            icon={MapPin}
            label="Location"
            value={owner.cityState || "—"}
            valueClassName="dash-card-owner-city"
          />
          <SponsorshipBlock logoUrl={event.sponsorLogoUrl} />
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
        <p className="flex flex-wrap items-center justify-center gap-1.5 text-center text-[0.55rem] font-bold uppercase tracking-[0.1em] text-[#142047] sm:text-[0.6rem]">
          <span className="text-[#b91c1c]" aria-hidden>
            ★★★
          </span>
          Thank you for supporting the classic car community
          <span className="text-[#b91c1c]" aria-hidden>
            ★★★
          </span>
        </p>
      </footer>
    </article>
  );
}
