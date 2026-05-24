import { describe, expect, it } from "vitest";
import { eventCharitySchema } from "./charity";
import { eventSponsorSchema } from "./sponsor";

describe("eventSponsorSchema", () => {
  it("accepts expanded sponsor fields and normalizes website", () => {
    const parsed = eventSponsorSchema.parse({
      sponsorName: "Acme Auto",
      sponsorPrimaryContact: "Jane Smith",
      sponsorStreet: "123 Main St",
      sponsorCity: "Austin",
      sponsorState: "TX",
      sponsorZip: "78701",
      sponsorPhone: "555-0100",
      sponsorEmail: "info@acme.com",
      sponsorWebsite: "acme.com",
    });

    expect(parsed.sponsorWebsite).toMatch(/^https:\/\/acme\.com\/?$/);
  });

  it("rejects invalid sponsor email", () => {
    const result = eventSponsorSchema.safeParse({
      sponsorEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("eventCharitySchema", () => {
  it("accepts charity fields and normalizes website", () => {
    const parsed = eventCharitySchema.parse({
      charityName: "Food Bank",
      charityDescription: "Supporting local families.",
      charityWebsite: "foodbank.org",
      charityEmail: "info@foodbank.org",
      charityPhone: "555-0200",
    });

    expect(parsed.charityWebsite).toMatch(/^https:\/\/foodbank\.org\/?$/);
  });
});
