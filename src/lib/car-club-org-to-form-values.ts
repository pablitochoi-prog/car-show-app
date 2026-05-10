import type { Organization } from "@prisma/client";
import type { CarClubFormValues } from "@/app/dashboard/clubs/new/car-club-form-values";

/** Map DB row to client form state for edit club. */
export function organizationToCarClubFormValues(
  org: Organization
): CarClubFormValues {
  return {
    name: org.name ?? "",
    logo: org.logo ?? "",
    logoFileName: "",
    description: org.description ?? "",
    motto: org.motto ?? "",
    primaryMeetingLocation: org.primaryMeetingLocation ?? "",
    meetingFrequency: org.meetingFrequency ?? "",
    meetingTime: org.meetingTime?.trim() ? org.meetingTime : "10:00",
    meetingVenueName: org.meetingVenueName ?? "",
    street: org.street ?? "",
    city: org.city ?? "",
    state: org.state ?? "",
    zip: org.zip ?? "",
    lat: org.lat != null ? String(org.lat) : "",
    lng: org.lng != null ? String(org.lng) : "",
    contactFirstName: org.contactFirstName ?? "",
    contactLastName: org.contactLastName ?? "",
    contactEmail: org.contactEmail ?? "",
    contactPhone: org.contactPhone ?? "",
    contactRole: org.contactRole ?? "",
    websiteUrl: org.websiteUrl ?? "",
    facebookUrl: org.facebookUrl ?? "",
    instagramUrl: org.instagramUrl ?? "",
    youtubeUrl: org.youtubeUrl ?? "",
    tikTokUrl: org.tikTokUrl ?? "",
    openToPublic: org.openToPublic,
    requiresMemberAccount: org.requiresMemberAccount,
    yearFounded: org.yearFounded != null ? String(org.yearFounded) : "",
    clubState: org.clubState ?? "",
  };
}
