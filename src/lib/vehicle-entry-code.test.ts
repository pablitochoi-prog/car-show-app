import { describe, expect, it } from "vitest";
import {
  isValidPublicVehicleId,
  normalizeVehicleEntryCode,
  vehicleSmartRouteUrl,
} from "@/lib/vehicle-entry-code";

describe("vehicle-entry-code", () => {
  it("normalizes valid codes", () => {
    expect(normalizeVehicleEntryCode("axy-004")).toBe("AXY-004");
    expect(isValidPublicVehicleId("AXY-004")).toBe(true);
  });

  it("rejects invalid codes", () => {
    expect(normalizeVehicleEntryCode("bad")).toBeNull();
    expect(normalizeVehicleEntryCode("uuid-123")).toBeNull();
  });

  it("builds smart route URLs", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://carshowscout.com";
    expect(vehicleSmartRouteUrl("AXY-004")).toBe(
      "https://carshowscout.com/v/AXY-004",
    );
  });
});
