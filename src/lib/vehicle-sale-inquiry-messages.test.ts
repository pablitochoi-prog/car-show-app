import { describe, expect, it } from "vitest";
import {
  BELOW_OFFER_INQUIRY_MESSAGE,
  INQUIRIES_CLOSED_API_MESSAGE,
  inquiriesClosedPageMessage,
} from "./vehicle-sale-inquiry-messages";

describe("vehicle sale inquiry messages", () => {
  it("uses generic below-threshold copy without exposing amounts", () => {
    expect(BELOW_OFFER_INQUIRY_MESSAGE).not.toMatch(/\$/);
    expect(BELOW_OFFER_INQUIRY_MESSAGE).not.toMatch(/minimum/i);
    expect(BELOW_OFFER_INQUIRY_MESSAGE).toContain("not accepting inquiries");
  });

  it("uses safe closed-listing API copy", () => {
    expect(INQUIRIES_CLOSED_API_MESSAGE).not.toMatch(/minimum/i);
    expect(INQUIRIES_CLOSED_API_MESSAGE).not.toMatch(/\$/);
  });

  it("formats closed page banner with event label", () => {
    expect(inquiriesClosedPageMessage("EVT-1003 Cruisin Classics Car Show")).toBe(
      "Owner is no longer accepting inquiries about this vehicle — EVT-1003 Cruisin Classics Car Show",
    );
  });
});
