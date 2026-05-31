import { describe, expect, it } from "vitest";
import { toPublicVehicleSaleListing } from "./public-vehicle-sale-listing-map";

describe("toPublicVehicleSaleListing", () => {
  it("maps public listing fields without private screening data", () => {
    const row = {
      id: "listing-1",
      description: "<p>Story</p>",
      askingPriceCents: 2500000,
      showAskingPricePublicly: true,
      allowOffers: true,
      photos: [{ publicUrl: "https://cdn.example/photo.jpg" }],
    };

    const publicListing = toPublicVehicleSaleListing(row);

    expect(publicListing).toEqual({
      listingId: "listing-1",
      description: "<p>Story</p>",
      askingPriceCents: 2500000,
      showAskingPricePublicly: true,
      allowOffers: true,
      photos: [{ publicUrl: "https://cdn.example/photo.jpg" }],
    });
    expect(publicListing).not.toHaveProperty("minimumOfferCents");
    expect(publicListing).not.toHaveProperty("enabled");
    expect(publicListing).not.toHaveProperty("sellerUserId");
  });
});
