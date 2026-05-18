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
  /** Optional sponsor logo in the left column footer; placeholder when null */
  sponsorLogoUrl?: string | null;
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
};

export type DashCardVotingModel = {
  /** SMS destination number as printed, e.g. "22333" */
  smsShortCode: string;
  /**
   * MUST be the full public vehicle id (e.g. AXY-004) so voters at concurrent shows
   * disambiguate by event prefix. Empty when the ID is not assigned yet — UI omits SMS wording.
   */
  vehicleIdForSms: string;
  ratesDisclaimer?: string;
  /** Shown under QR, e.g. "Scan to Vote or Judge" */
  qrSectionTitle: string;
  /** Human-readable destination, e.g. URL for small print under placeholder */
  qrDestinationHint: string;
  /** When wired: data URL or absolute URL to a rendered QR image */
  qrImageUrl?: string | null;
};

export type DashCardModel = {
  event: DashCardEventModel;
  vehicle: DashCardVehicleModel;
  owner: DashCardOwnerModel;
  vehicleStory: string;
  voting: DashCardVotingModel;
};
