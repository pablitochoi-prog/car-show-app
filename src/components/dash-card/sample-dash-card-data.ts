import type { DashCardModel } from "@/lib/dash-card-types";

/**
 * Sample data only — replace with DB-backed `DashCardModel` from server components or API.
 */
export const SAMPLE_DASH_CARD_DATA: DashCardModel = {
  event: {
    showName: "Desert Chrome Classic Car Show",
    hostOrganizationName: "Desert Chrome Car Club",
    dateRangeLabel: "January 1 – December 31, 2026",
    timeLabel: "9:00 AM – 5:00 PM",
    venue: "Las Vegas Convention Center",
    logoUrl: null,
    sponsorLogoUrl: null,
    sponsorWebsiteUrl: null,
    sponsorName: null,
  },
  siteSponsor: {
    logoUrl: null,
    websiteUrl: null,
    name: null,
  },
  vehicle: {
    publicVehicleId: "AXY-005",
    year: 1959,
    make: "Cadillac",
    model: "Eldorado",
    trim: "Biarritz",
    nickname: "Miss Behavin’",
    classLabel: "Class 5 – GM 1950–1990",
    vehiclePhotoUrl: null,
  },
  owner: {
    name: "Anthony Jackson",
    cityState: "San Diego, CA",
  },
  vehicleStory:
    "Restored over a five-year period with meticulous attention to detail, Miss Behavin’ is a stunning example of late-1950s Cadillac luxury and style. One of just 1,320 Eldorado Biarritz convertibles produced in 1959, this car has been cherished by its current owner for over 15 years.",
  voting: {
    smsShortCode: "22333",
    vehicleIdForSms: "AXY-005",
    ratesDisclaimer: "Standard message rates apply.",
    qrSectionTitle: "Scan to Vote or Judge",
    qrDestinationHint: "carshow.vote/AXY-004",
    qrImageUrl: null,
  },
  sale: {
    badgeLabel: "Owner Accepting Inquiries on this Vehicle",
    salePageUrl: "https://events.carshowscout.com/v/AXY-005/sale",
    qrImageUrl: null,
  },
};
