import { formatUsdWholeDollars } from "@/lib/money";
import type { PublicVehicleSaleListing } from "@/lib/public-vehicle-sale-listing-map";

export function publicAskingPriceCents(
  listing: Pick<
    PublicVehicleSaleListing,
    "askingPriceCents" | "showAskingPricePublicly"
  >,
): number | null {
  if (!listing.showAskingPricePublicly || listing.askingPriceCents == null) {
    return null;
  }
  return listing.askingPriceCents;
}

type Props = {
  listing: Pick<
    PublicVehicleSaleListing,
    "askingPriceCents" | "showAskingPricePublicly"
  >;
  className?: string;
  priceClassName?: string;
};

/** Buyer-facing asking price when the owner opted in to show it publicly. */
export function PublicAskingPriceDisplay({
  listing,
  className = "text-sm text-foreground",
  priceClassName = "font-semibold text-foreground",
}: Props) {
  const cents = publicAskingPriceCents(listing);
  if (cents == null) return null;

  return (
    <p className={className}>
      <span className="font-medium">Asking Price: </span>
      <span className={priceClassName}>
        {formatUsdWholeDollars(cents / 100)}
      </span>
    </p>
  );
}
