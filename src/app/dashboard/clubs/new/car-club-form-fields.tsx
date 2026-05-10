"use client";

import { CarClubDetailsMeetingSection } from "./car-club-details-meeting";
import { CarClubContactOnlineAboutSection } from "./car-club-contact-online-about";
import type { CarClubFormValues } from "./car-club-form-values";

export type { CarClubFormValues } from "./car-club-form-values";

export function CarClubFormFields({
  v,
  patch,
  organizationId,
  showUpcomingInAbout = true,
}: {
  v: CarClubFormValues;
  patch: (p: Partial<CarClubFormValues>) => void;
  organizationId?: string | null;
  showUpcomingInAbout?: boolean;
}) {
  return (
    <div className="space-y-6">
      <CarClubDetailsMeetingSection v={v} patch={patch} />
      <CarClubContactOnlineAboutSection
        v={v}
        patch={patch}
        organizationId={organizationId}
        showUpcomingInAbout={showUpcomingInAbout}
      />
    </div>
  );
}
