import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { vehicleSmartRouteUrl } from "@/lib/vehicle-entry-code";

/**
 * Dash-card QR codes open `/v/{vehicleEntryCode}` — a smart route that shows
 * public voting by default, judge scoring for judges, and a staff hub for organizers.
 */
describe("vehicle entry smart route (/v/[vehicleEntryCode])", () => {
  it("encodes the public smart-route URL in dash-card QR codes", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://events.carshowscout.com";
    expect(vehicleSmartRouteUrl("BZB-001")).toBe(
      "https://events.carshowscout.com/v/BZB-001",
    );
  });

  it("does not set vote cookies during Server Component render (regression)", () => {
    const pagePath = join(
      process.cwd(),
      "src/app/v/[vehicleEntryCode]/page.tsx",
    );
    const src = readFileSync(pagePath, "utf8");
    expect(src).not.toContain("getOrCreateVoterKey");
    expect(src).toContain("getVisitorPublicVoteContext");
    expect(src).toContain("readVoterFingerprint");
  });
});
