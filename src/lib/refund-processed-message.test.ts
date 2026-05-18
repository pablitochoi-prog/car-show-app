import { describe, expect, it } from "vitest";
import { buildRefundProcessedMessageBody } from "./refund-processed-message";

describe("buildRefundProcessedMessageBody", () => {
  it("formats the organizer refund notice", () => {
    const body = buildRefundProcessedMessageBody({
      firstName: "Jane",
      clubName: "Radwood Club",
      refundCents: 5100,
      eventShowNumber: 1002,
      eventName: "Rad Wood, 80s and above.",
      eventStartDate: new Date("2026-05-17T12:00:00.000Z"),
    });

    expect(body).toBe(
      "Jane, Radwood Club has just processed a refund transaction in the amount of $51.00 for EVT-1002 Rad Wood, 80s and above. that takes place on 05/17/2026.  Please allow up to 7 days for refund to process.",
    );
  });
});
