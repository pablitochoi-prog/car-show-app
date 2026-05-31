/** Public buyer-facing listing fields — never includes private screening data. */
export type PublicVehicleSaleListing = {
  listingId: string;
  description: string | null;
  askingPriceCents: number | null;
  showAskingPricePublicly: boolean;
  allowOffers: boolean;
  photos: Array<{ publicUrl: string }>;
};

type ListingRow = {
  id: string;
  description: string | null;
  askingPriceCents: number | null;
  showAskingPricePublicly: boolean;
  allowOffers: boolean;
  photos: Array<{ publicUrl: string }>;
};

export function toPublicVehicleSaleListing(
  row: ListingRow,
): PublicVehicleSaleListing {
  return {
    listingId: row.id,
    description: row.description,
    askingPriceCents: row.askingPriceCents,
    showAskingPricePublicly: row.showAskingPricePublicly,
    allowOffers: row.allowOffers,
    photos: row.photos.map((photo) => ({ publicUrl: photo.publicUrl })),
  };
}
