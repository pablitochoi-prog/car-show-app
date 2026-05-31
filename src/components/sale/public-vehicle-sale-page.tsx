import { VehicleEntryHeader } from "@/components/vehicle-entry/vehicle-entry-header";
import { PublicVehicleSaleInquiryForm } from "@/components/sale/public-vehicle-sale-inquiry-form";
import { PublicVehicleSalePhotos } from "@/components/sale/public-vehicle-sale-photos";
import { PolicyPageContent } from "@/components/legal/policy-page-content";
import { formatEventShowNumber } from "@/lib/event-show-number";
import { formatUsdWholeDollars } from "@/lib/money";
import { VEHICLE_SALE_PUBLIC_DISCLAIMER } from "@/lib/vehicle-sale-disclaimer";
import type { PublicVehicleSalePageData } from "@/lib/public-vehicle-sale-listing";

export function PublicVehicleSalePage({
  data,
  defaultSmsNotificationsOptIn = false,
}: {
  data: PublicVehicleSalePageData;
  defaultSmsNotificationsOptIn?: boolean;
}) {
  const { entry, listing, eventShowNumber } = data;
  const eventLabel = `${formatEventShowNumber(eventShowNumber)} ${entry.event.name}`;
  const showPrice =
    listing.showAskingPricePublicly && listing.askingPriceCents != null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <VehicleEntryHeader
        entry={entry}
        subtitle={`Owner accepting inquiries · ${eventLabel}`}
      />

      <PublicVehicleSalePhotos
        mainPhotoUrl={entry.photoUrl}
        mainPhotoAlt={`${entry.make} ${entry.model}`}
        listingPhotos={listing.photos}
      />

      <section className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Vehicle listing</h2>
        {showPrice ? (
          <p className="text-xl font-bold text-foreground">
            {formatUsdWholeDollars(listing.askingPriceCents! / 100)}
          </p>
        ) : null}
        {listing.description?.trim() ? (
          <PolicyPageContent
            html={listing.description}
            className="text-sm text-muted-foreground"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            The owner has not added a written description yet.
          </p>
        )}
        {listing.allowOffers ? (
          <p className="text-sm text-muted-foreground">
            The owner is open to offers
            {listing.minimumOfferCents != null
              ? ` (minimum ${formatUsdWholeDollars(listing.minimumOfferCents / 100)})`
              : ""}
            .
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">{VEHICLE_SALE_PUBLIC_DISCLAIMER}</p>
      </section>

      <PublicVehicleSaleInquiryForm
        vehicleEntryCode={entry.vehicleEntryCode}
        listing={listing}
        defaultSmsNotificationsOptIn={defaultSmsNotificationsOptIn}
      />
    </div>
  );
}
