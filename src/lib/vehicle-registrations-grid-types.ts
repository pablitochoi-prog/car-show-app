/** Client-safe types for the vehicle registrations grid (no Prisma / server imports). */

export type VehicleRegistrationsCategoryColumn = {
  sectionId: string;
  name: string;
  sortOrder: number;
};

export type VehicleRegistrationsVehicleClass = {
  id: string;
  name: string;
  sortOrder: number;
};

export type VehicleRegistrationsGridRow = {
  registrationVehicleId: string;
  /** Parent registration id (for dash card printing). */
  registrationId: string;
  eventCategoryId: string | null;
  /** Event entry code shown to judges and voters (e.g. AXY-004). */
  publicVehicleId: string | null;
  photoUrl: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  vin: string | null;
  vehicleClass: string | null;
  ownerName: string | null;
  judgeBySectionId: Record<string, string | null>;
};

export type VehicleRegistrationsGrid = {
  /** True when the event uses score sheet judging (active judging classes). */
  scoreSheetJudgingEnabled: boolean;
  categories: VehicleRegistrationsCategoryColumn[];
  vehicleClasses: VehicleRegistrationsVehicleClass[];
  rows: VehicleRegistrationsGridRow[];
};

export const VEHICLE_REGISTRATIONS_UNASSIGNED_JUDGE = "(Unassigned)";
