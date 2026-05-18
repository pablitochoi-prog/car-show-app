import { describe, expect, it } from "vitest";
import { registrationClubCollectedCents } from "./registration-row-money";
import {
  buildRegistrationCancelledMessageBody,
  formatEventVenueLabel,
} from "./registration-cancelled-message";

describe("registration cancelled message", () => {
  it("builds the cancellation notice", () => {
    const body = buildRegistrationCancelledMessageBody({
      eventName: "Rad Wood, 80s and above.",
      eventVenue: "Golden Gate Park",
      eventDate: "05/17/2026",
    });

    expect(body).toBe(
      "Your registration for Rad Wood, 80s and above. at Golden Gate Park on 05/17/2026 has been cancelled. No refund has been issued.",
    );
  });

  it("falls back to city and state for venue", () => {
    expect(
      formatEventVenueLabel({
        venue: null,
        city: "Berkeley",
        state: "CA",
      }),
    ).toBe("Berkeley, CA");
  });

  it("treats unpaid registrations as zero collected", () => {
    expect(
      registrationClubCollectedCents(
        {
          paymentStatus: "PENDING",
          amountCents: null,
          platformFeeCents: null,
          tier: { priceCents: 2000 },
          vehicles: [{ id: "v1" }],
          guestVehicles: null,
        },
        { registrationFeeType: "PAID_TIERED" },
      ),
    ).toBe(0);
  });

  it("counts paid club revenue as collected", () => {
    expect(
      registrationClubCollectedCents(
        {
          paymentStatus: "PAID",
          amountCents: 5100,
          platformFeeCents: 100,
          tier: { priceCents: 2000 },
          vehicles: [{ id: "v1" }],
          guestVehicles: null,
        },
        { registrationFeeType: "DONATION" },
      ),
    ).toBe(5000);
  });
});
