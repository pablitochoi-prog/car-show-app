"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UsPhoneInput } from "@/components/inputs/us-phone-input";
import { CLUB_CONTACT_ROLES } from "@/lib/car-club";
import { cn } from "@/lib/utils";
import {
  CAR_CLUB_INPUT_CLASS as inputClass,
  type CarClubFormValues,
} from "./car-club-form-values";
import { CarClubInfoCard } from "./car-club-info-card";
import { CarClubMeetingLocationCard } from "./car-club-meeting-location-card";
import { CarClubAboutCard } from "./car-club-about-card";

export function CarClubContactOnlineAboutSection({
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
    <>
      <Card>
        <CardHeader>
          <CardTitle>Club contact</CardTitle>
          <CardDescription>
            Primary officer or point of contact for the club listing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,0.75fr)]">
            <div className="space-y-2">
              <Label htmlFor="contactFirstName">First name</Label>
              <Input
                id="contactFirstName"
                className={inputClass}
                value={v.contactFirstName}
                onChange={(e) => patch({ contactFirstName: e.target.value })}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactLastName">Last name</Label>
              <Input
                id="contactLastName"
                className={inputClass}
                value={v.contactLastName}
                onChange={(e) => patch({ contactLastName: e.target.value })}
                autoComplete="family-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactRole">Role</Label>
              <select
                id="contactRole"
                className={cn(
                  inputClass,
                  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
                )}
                value={v.contactRole}
                onChange={(e) => patch({ contactRole: e.target.value })}
              >
                <option value="">Select role</option>
                {CLUB_CONTACT_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email</Label>
              <Input
                id="contactEmail"
                type="email"
                className={inputClass}
                value={v.contactEmail}
                onChange={(e) => patch({ contactEmail: e.target.value })}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Phone</Label>
              <UsPhoneInput
                id="contactPhone"
                value={v.contactPhone}
                onChange={(masked) => patch({ contactPhone: masked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <CarClubInfoCard v={v} patch={patch} />
      <CarClubMeetingLocationCard v={v} patch={patch} />
      <CarClubAboutCard
        v={v}
        patch={patch}
        organizationId={organizationId}
        showUpcomingInAbout={showUpcomingInAbout}
      />
    </>
  );
}
