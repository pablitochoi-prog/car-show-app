export const REGISTRATION_VEHICLE_REQUIRED_MSG =
  "Add at least one vehicle to your registration.";

export const REGISTRATION_CLASS_REQUIRED_MSG =
  "Select a class for every vehicle on your registration.";

/** Logged-in registration: every vehicle needs a valid event category when the event has classes. */
export function validateRegistrationVehiclesAndClasses(input: {
  allowedCategoryIds: string[];
  vehicleIds: string[];
  vehicleCategories?: Record<string, string | null | undefined>;
}): string | null {
  if (input.vehicleIds.length === 0) {
    return REGISTRATION_VEHICLE_REQUIRED_MSG;
  }
  if (input.allowedCategoryIds.length === 0) {
    return null;
  }
  const allowed = new Set(input.allowedCategoryIds);
  for (const vehicleId of input.vehicleIds) {
    const categoryId = input.vehicleCategories?.[vehicleId];
    if (!categoryId || !allowed.has(categoryId)) {
      return REGISTRATION_CLASS_REQUIRED_MSG;
    }
  }
  return null;
}

/** Guest registration: every vehicle row needs a valid event category when the event has classes. */
export function validateGuestRegistrationVehiclesAndClasses(input: {
  allowedCategoryIds: string[];
  vehicles: { eventCategoryId?: string | null }[];
}): string | null {
  if (input.vehicles.length === 0) {
    return REGISTRATION_VEHICLE_REQUIRED_MSG;
  }
  if (input.allowedCategoryIds.length === 0) {
    return null;
  }
  const allowed = new Set(input.allowedCategoryIds);
  for (const vehicle of input.vehicles) {
    if (!vehicle.eventCategoryId || !allowed.has(vehicle.eventCategoryId)) {
      return REGISTRATION_CLASS_REQUIRED_MSG;
    }
  }
  return null;
}

export function loggedInVehiclesHaveRequiredClasses(
  hasCategories: boolean,
  vehicleIds: string[],
  vehicleCategories: Record<string, string | null | undefined>,
): boolean {
  if (!hasCategories) return true;
  return vehicleIds.every((id) => {
    const categoryId = vehicleCategories[id];
    return typeof categoryId === "string" && categoryId.length > 0;
  });
}

export function guestVehiclesHaveRequiredClasses(
  hasCategories: boolean,
  vehicles: { eventCategoryId: string | null }[],
): boolean {
  if (!hasCategories) return true;
  return vehicles.every((v) => Boolean(v.eventCategoryId));
}
