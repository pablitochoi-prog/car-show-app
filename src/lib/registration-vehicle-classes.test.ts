import { describe, expect, it } from "vitest";
import {
  REGISTRATION_CLASS_REQUIRED_MSG,
  REGISTRATION_VEHICLE_REQUIRED_MSG,
  validateGuestRegistrationVehiclesAndClasses,
  validateRegistrationVehiclesAndClasses,
} from "./registration-vehicle-classes";

describe("validateRegistrationVehiclesAndClasses", () => {
  it("requires at least one vehicle", () => {
    expect(
      validateRegistrationVehiclesAndClasses({
        allowedCategoryIds: ["c1"],
        vehicleIds: [],
        vehicleCategories: {},
      }),
    ).toBe(REGISTRATION_VEHICLE_REQUIRED_MSG);
  });

  it("skips class check when event has no categories", () => {
    expect(
      validateRegistrationVehiclesAndClasses({
        allowedCategoryIds: [],
        vehicleIds: ["v1"],
        vehicleCategories: {},
      }),
    ).toBeNull();
  });

  it("requires a class per vehicle when categories exist", () => {
    expect(
      validateRegistrationVehiclesAndClasses({
        allowedCategoryIds: ["c1"],
        vehicleIds: ["v1", "v2"],
        vehicleCategories: { v1: "c1" },
      }),
    ).toBe(REGISTRATION_CLASS_REQUIRED_MSG);
  });

  it("accepts valid assignments", () => {
    expect(
      validateRegistrationVehiclesAndClasses({
        allowedCategoryIds: ["c1", "c2"],
        vehicleIds: ["v1", "v2"],
        vehicleCategories: { v1: "c1", v2: "c2" },
      }),
    ).toBeNull();
  });
});

describe("validateGuestRegistrationVehiclesAndClasses", () => {
  it("requires class on each guest vehicle when categories exist", () => {
    expect(
      validateGuestRegistrationVehiclesAndClasses({
        allowedCategoryIds: ["c1"],
        vehicles: [{ year: 1969, make: "Ford", model: "Mustang" }],
      }),
    ).toBe(REGISTRATION_CLASS_REQUIRED_MSG);
  });
});
