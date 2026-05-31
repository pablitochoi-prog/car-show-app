import { VehicleEntryHeader } from "@/components/vehicle-entry/vehicle-entry-header";
import { PublicAskingPriceDisplay } from "@/components/sale/public-asking-price-display";
import { PublicVehicleSaleInquiryForm } from "@/components/sale/public-vehicle-sale-inquiry-form";
import { PublicVehicleSalePhotos } from "@/components/sale/public-vehicle-sale-photos";
import { PolicyPageContent } from "@/components/legal/policy-page-content";
import { formatEventShowNumber } from "@/lib/event-show-number";
import { inquiriesClosedPageMessage } from "@/lib/vehicle-sale-inquiry-messages";
import { VEHICLE_SALE_PUBLIC_DISCLAIMER } from "@/lib/vehicle-sale-disclaimer";
import type { PublicVehicleSalePageData } from "@/lib/public-vehicle-sale-listing";

export function PublicVehicleSalePage({
  data,
  defaultSmsNotificationsOptIn = false,
}: {
  data: PublicVehicleSalePageData;
  defaultSmsNotificationsOptIn?: boolean;
}) {
  const { entry, listing, eventShowNumber, inquiriesOpen } = data;
  const eventLabel = `${formatEventShowNumber(eventShowNumber)} ${entry.event.name}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <VehicleEntryHeader
        entry={entry}
        subtitle={
          inquiriesOpen
            ? `Interested in Buying? · Owner is open to inquiries · ${eventLabel}`
            : inquiriesClosedPageMessage(eventLabel)
        }
      />

      {!inquiriesOpen ? (
        <p
          className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          {inquiriesClosedPageMessage(eventLabel)}
        </p>
      ) : null}

      <PublicVehicleSalePhotos
        mainPhotoUrl={entry.photoUrl}
        mainPhotoAlt={`${entry.make} ${entry.model}`}
        listingPhotos={listing.photos}
      />

      {entry.vehicleStory?.trim() ? (
        <section className="space-y-2 rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Vehicle story</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {entry.vehicleStory.trim()}
          </p>
        </section>
      ) : null}

      <section className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Vehicle listing</h2>
        <PublicAskingPriceDisplay
          listing={listing}
          className="text-base text-foreground"
          priceClassName="text-xl font-bold text-foreground"
        />
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
        {listing.allowOffers && inquiriesOpen ? (
          <p className="text-sm text-muted-foreground">
            The owner is open to offers.
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">{VEHICLE_SALE_PUBLIC_DISCLAIMER}</p>
      </section>

      <PublicVehicleSaleInquiryForm
        vehicleEntryCode={entry.vehicleEntryCode}
        listing={listing}
        inquiriesOpen={inquiriesOpen}
        defaultSmsNotificationsOptIn={defaultSmsNotificationsOptIn}
      />
    </div>
  );
}
