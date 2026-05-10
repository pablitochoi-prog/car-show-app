export type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

/** Maps Google Geocoder / Places `address_components` into US-style fields. */
export function parseGoogleAddressComponents(
  components: GoogleAddressComponent[]
): { street: string; city: string; state: string; zip: string } {
  let streetNumber = "";
  let route = "";
  let city = "";
  let state = "";
  let zip = "";

  for (const c of components) {
    const t = c.types;
    if (t.includes("street_number")) streetNumber = c.long_name;
    if (t.includes("route")) route = c.long_name;
    if (t.includes("locality")) city = c.long_name;
    if (t.includes("administrative_area_level_1")) state = c.short_name;
    if (t.includes("postal_code")) zip = c.long_name;
  }

  if (!city) {
    for (const c of components) {
      if (
        c.types.includes("sublocality") ||
        c.types.includes("sublocality_level_1") ||
        c.types.includes("neighborhood")
      ) {
        city = c.long_name;
        break;
      }
    }
  }

  if (!city) {
    for (const c of components) {
      if (c.types.includes("postal_town")) {
        city = c.long_name;
        break;
      }
    }
  }

  const street = [streetNumber, route].filter(Boolean).join(" ").trim();
  return { street, city, state, zip };
}

const VENUE_TYPES = new Set([
  "establishment",
  "point_of_interest",
  "tourist_attraction",
  "park",
  "stadium",
  "museum",
  "church",
  "school",
  "lodging",
  "premise",
  "subpremise",
]);

/** Business / landmark name when the place is a POI; otherwise empty (street geocode). */
export function venueNameFromPlace(types: string[], placeName: string): string {
  const name = placeName?.trim() ?? "";
  if (!name) return "";
  const looksLikeVenue = types.some((t) => VENUE_TYPES.has(t));
  return looksLikeVenue ? name : "";
}
