import type { EventStatus } from "@prisma/client";

export type VehicleEntryKind = "registration_vehicle" | "guest_json";

export type VehicleEntryRecord = {
  kind: VehicleEntryKind;
  vehicleEntryCode: string;
  eventId: string;
  registrationId: string;
  registrationVehicleId: string | null;
  guestVehicleIndex: number | null;
  vehicleId: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  nickname: string | null;
  /** Event-specific vehicle story for public pages and dash cards. */
  vehicleStory: string | null;
  classLabel: string;
  /** Registration vehicle class ID for ballot eligibility checks. */
  eventCategoryId: string | null;
  /** Public http(s) URL or same-origin API path for event-published photo. */
  photoUrl: string | null;
  votingStatus: string | null;
  judgingStatus: string | null;
  vehicleQrObjectKey: string | null;
  vehicleQrUrl: string | null;
  event: {
    id: string;
    name: string;
    status: EventStatus;
    startDate: Date;
    endDate: Date | null;
    venue: string | null;
    city: string | null;
    state: string | null;
  };
};

export type VehicleEntryVisitorRole =
  | "anonymous"
  | "user"
  | "judge"
  | "organizer";
