import { describe, expect, it } from "vitest";
import {
  buildVehicleSaleInquiryMessageBody,
  buildVehicleSaleInquiryMessageSubject,
} from "./vehicle-sale-inquiry-in-app-message";

describe("vehicle sale inquiry in-app message", () => {
  it("builds subject with vehicle entry code and event label", () => {
    expect(
      buildVehicleSaleInquiryMessageSubject({
        vehicleEntryCode: "ABC123",
        eventShowNumber: 1003,
        eventName: "Cruisin Classics",
      }),
    ).toBe("Buyer inquiry: ABC123 at EVT-1003 Cruisin Classics");
  });

  it("includes buyer contact details and offer without minimum-offer language", () => {
    const body = buildVehicleSaleInquiryMessageBody({
      eventShowNumber: 1003,
      eventName: "Cruisin Classics",
      vehicleLabel: "1969 Ford Mustang",
      vehicleEntryCode: "ABC123",
      buyerName: "Jane Buyer",
      buyerEmail: "jane@example.com",
      buyerPhone: "555-0100",
      smsNotificationsOptIn: true,
      offerAmountCents: 2500000,
      message: "<p>Is this still available?</p>",
      inquiryDetailUrl: "https://carshowscout.com/dashboard/sale-inquiries/inq-1",
    });

    expect(body).toContain("Jane Buyer");
    expect(body).toContain("jane@example.com");
    expect(body).toContain("555-0100");
    expect(body).toContain("SMS opt-in: Yes");
    expect(body).toContain("$25,000");
    expect(body).toContain("Is this still available?");
    expect(body).toContain("View in your dashboard:");
    expect(body).not.toMatch(/minimum/i);
  });

  it("omits offer line when no offer was submitted", () => {
    const body = buildVehicleSaleInquiryMessageBody({
      eventShowNumber: 1,
      eventName: "Test Show",
      vehicleLabel: "2020 Honda Civic",
      vehicleEntryCode: "XYZ",
      buyerName: "Bob",
      buyerEmail: "bob@example.com",
      buyerPhone: null,
      smsNotificationsOptIn: false,
      offerAmountCents: null,
      message: null,
      inquiryDetailUrl: null,
    });

    expect(body).not.toMatch(/^Offer:/m);
    expect(body).not.toContain("View in your dashboard:");
  });
});
