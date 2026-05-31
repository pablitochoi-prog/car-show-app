import { describe, expect, it } from "vitest";
import { eventVehicleSaleSettingsSchema } from "@/lib/validation/vehicle-sale-settings";

describe("eventVehicleSaleSettingsSchema", () => {
  it("accepts boolean toggle", () => {
    expect(
      eventVehicleSaleSettingsSchema.safeParse({
        vehicleSaleInquiriesEnabled: true,
      }).success,
    ).toBe(true);
    expect(
      eventVehicleSaleSettingsSchema.safeParse({
        vehicleSaleInquiriesEnabled: false,
      }).success,
    ).toBe(true);
  });

  it("rejects missing field", () => {
    expect(eventVehicleSaleSettingsSchema.safeParse({}).success).toBe(false);
  });
});
