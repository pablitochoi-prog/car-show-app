/**
 * Canonical shapes for printable dash cards.
 *
 * TODO (later): Load these from Prisma — e.g. `Event`, `Registration` + `RegistrationVehicle`,
 * `Vehicle`, user profile fields, `EventCategory` / display class label, and org branding.
 */
export type DashCardEventModel = {
  showName: string;
  /** Hosting club or organization; shown under the event name when set */
  hostOrganizationName?: string | null;
  /** Calendar date or range, e.g. "January 1 – December 31, 2026" */
  dateRangeLabel: string;
  /** Show hours, e.g. "9:00 AM – 5:00 PM"; omit row when null */
  timeLabel?: string | null;
  venue: string;
  /** Event logo, falling back to organization logo; placeholder when null */
  logoUrl?: string | null;
  /** Optional event sponsor logo (left in “Show sponsored by”) */
  sponsorLogoUrl?: string | null;
  /** Event sponsor website for clickable logo */
  sponsorWebsiteUrl?: string | null;
  /** Shown when event logo is missing */
  sponsorName?: string | null;
};

export type DashCardSponsorModel = {
  logoUrl?: string | null;
  websiteUrl?: string | null;
  name?: string | null;
};

export type DashCardVehicleModel = {
  /**
   * Full show ID shown on the card and in SMS (event 3-char prefix + "-" + 3 digits).
   * Example: "AXY-005" (3 letters A–Z, no I/O, hyphen, 3 digits). Null when unassigned.
   */
  publicVehicleId: string | null;
  year: number;
  make: string;
  model: string;
  trim?: string | null;
  nickname?: string | null;
  /** Class / category line for judges and display */
  classLabel: string;
  vehiclePhotoUrl?: string | null;
};

export type DashCardOwnerModel = {
  name: string;
  /** City and state on the card, e.g. "San Diego, CA" */
  cityState: string;
  /** Registrant profile photo for event staff dash cards */
  ownerPhotoUrl?: string | null;
};

export type DashCardVotingModel = {
  /** Shared platform SMS number as printed, e.g. "22333" */
  smsShortCode: string;
  /**
   * MUST be the full public vehicle id (e.g. AXY-004) so voters at concurrent shows
   * disambiguate by event prefix. Empty when the ID is not assigned yet — UI omits SMS wording.
   */
  vehicleIdForSms: string;
  /** Full SMS instruction line for the dash card Vote panel. */
  smsInstructionLine?: string;
  ratesDisclaimer?: string;
  /** Shown under QR, e.g. "Scan to Vote or Judge" */
  qrSectionTitle: string;
  /** Human-readable destination, e.g. URL for small print under placeholder */
  qrDestinationHint: string;
  /** When wired: data URL or absolute URL to a rendered QR image */
  qrImageUrl?: string | null;
};

/** Shown when owner opted in to buyer inquiries for this vehicle at the event. */
export type DashCardSaleModel = {
  badgeLabel: string;
  salePageUrl: string;
  qrImageUrl: string | null;
};

export type DashCardModel = {
  event: DashCardEventModel;
  /** Platform site sponsor (right in “Show sponsored by”) */
  siteSponsor: DashCardSponsorModel;
  vehicle: DashCardVehicleModel;
  owner: DashCardOwnerModel;
  vehicleStory: string;
  voting: DashCardVotingModel;
  /** Present when event sale inquiries are on and this vehicle listing is enabled. */
  sale?: DashCardSaleModel;
};
