import { describe, expect, it } from "vitest";
import {
  vehicleSalePageUrl,
  vehicleSmartRouteUrl,
} from "@/lib/vehicle-entry-code";

/**
 * Dash-card QR codes encode this smart-route URL. Anonymous visitors land on
 * the public vote panel; judges and organizers get role-specific views.
 */
describe("dash-card QR smart route", () => {
  it("uses NEXT_PUBLIC_APP_URL when configured", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://carshowscout.com";
    expect(vehicleSmartRouteUrl("AXY-004")).toBe(
      "https://carshowscout.com/v/AXY-004",
    );
  });

  it("targets the /v/{vehicleEntryCode} public smart route", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://carshowscout.com";
    const url = new URL(vehicleSmartRouteUrl("AXY-004"));
    expect(url.pathname).toBe("/v/AXY-004");
    expect(url.hostname).toBe("carshowscout.com");
  });
});

describe("dash-card sale QR route", () => {
  it("targets the /v/{vehicleEntryCode}/sale listing page", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://carshowscout.com";
    expect(vehicleSalePageUrl("AXY-005")).toBe(
      "https://carshowscout.com/v/AXY-005/sale",
    );
  });
});
