export type CarClubFormValues = {
  name: string;
  /** Public URL after upload; submitted with the form. */
  logo: string;
  /** Original filename for display only. */
  logoFileName: string;
  description: string;
  motto: string;
  primaryMeetingLocation: string;
  meetingFrequency: string;
  meetingTime: string;
  meetingVenueName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: string;
  lng: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone: string;
  contactRole: string;
  websiteUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  tikTokUrl: string;
  openToPublic: boolean;
  requiresMemberAccount: boolean;
  yearFounded: string;
  /** US postal state code for where the club is based (details section). */
  clubState: string;
};

export const CAR_CLUB_INPUT_CLASS = "w-full";
