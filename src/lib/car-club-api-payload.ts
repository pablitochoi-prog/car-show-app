import type { CarClubFormValues } from "@/app/dashboard/clubs/new/car-club-form-values";

/** Shared JSON body for POST create and PATCH update car club. */
export function buildCarClubApiPayload(v: CarClubFormValues) {
  const finiteOrUndef = (s: string, fn: (raw: string) => number) => {
    const t = s.trim();
    if (!t) return undefined;
    const n = fn(t);
    return Number.isFinite(n) ? n : undefined;
  };

  return {
    name: v.name.trim(),
    logo: v.logo.trim() || undefined,
    description: v.description.trim() || undefined,
    motto: v.motto.trim() || undefined,
    primaryMeetingLocation: v.primaryMeetingLocation.trim() || undefined,
    meetingFrequency: v.meetingFrequency.trim() || undefined,
    meetingTime: v.meetingTime.trim() || undefined,
    meetingVenueName: v.meetingVenueName.trim() || undefined,
    street: v.street.trim() || undefined,
    city: v.city.trim() || undefined,
    state: v.state.trim() || undefined,
    zip: v.zip.trim() || undefined,
    lat: finiteOrUndef(v.lat, Number),
    lng: finiteOrUndef(v.lng, Number),
    contactFirstName: v.contactFirstName.trim() || undefined,
    contactLastName: v.contactLastName.trim() || undefined,
    contactEmail: v.contactEmail.trim() || undefined,
    contactPhone: v.contactPhone.trim() || undefined,
    contactRole: v.contactRole.trim() || undefined,
    websiteUrl: v.websiteUrl.trim() || undefined,
    facebookUrl: v.facebookUrl.trim() || undefined,
    instagramUrl: v.instagramUrl.trim() || undefined,
    youtubeUrl: v.youtubeUrl.trim() || undefined,
    tikTokUrl: v.tikTokUrl.trim() || undefined,
    openToPublic: v.openToPublic,
    requiresMemberAccount: v.requiresMemberAccount,
    yearFounded: finiteOrUndef(v.yearFounded, (x) => Number.parseInt(x, 10)),
    clubState: v.clubState.trim() || undefined,
  };
}
