import { describe, expect, it } from "vitest";
import {
  BUYER_INQUIRIES_UNAVAILABLE_MESSAGE,
  buyerInquiryNoticeForListing,
} from "./vehicle-buyer-inquiry-notice";

describe("buyerInquiryNoticeForListing", () => {
  it("returns null when no listing row exists", () => {
    expect(buyerInquiryNoticeForListing(null)).toBeNull();
  });

  it("returns null when listing is active", () => {
    expect(
      buyerInquiryNoticeForListing({
        enabled: true,
        sellerAcknowledgedAt: new Date(),
      }),
    ).toBeNull();
  });

  it("returns notice when owner disabled a previously active listing", () => {
    expect(
      buyerInquiryNoticeForListing({
        enabled: false,
        sellerAcknowledgedAt: new Date(),
      }),
    ).toBe(BUYER_INQUIRIES_UNAVAILABLE_MESSAGE);
  });

  it("includes event label when provided", () => {
    expect(
      buyerInquiryNoticeForListing(
        {
          enabled: false,
          sellerAcknowledgedAt: new Date(),
        },
        "EVT-1003 Sample Show",
      ),
    ).toBe(
      "Owner is no longer accepting inquiries about this vehicle — EVT-1003 Sample Show",
    );
  });

  it("returns null when listing was never acknowledged", () => {
    expect(
      buyerInquiryNoticeForListing({
        enabled: false,
        sellerAcknowledgedAt: null,
      }),
    ).toBeNull();
  });
});
