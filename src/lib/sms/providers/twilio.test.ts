import { describe, expect, it } from "vitest";
import { buildTwilioWebhookUrl } from "./twilio";

describe("buildTwilioWebhookUrl", () => {
  it("uses x-forwarded proto and host on Vercel", () => {
    const request = new Request(
      "http://localhost:3000/api/sms/twilio/inbound",
      {
        headers: {
          "x-forwarded-proto": "https",
          "x-forwarded-host": "car-show-app-murex.vercel.app",
          host: "localhost:3000",
        },
      },
    );
    expect(buildTwilioWebhookUrl(request)).toBe(
      "https://car-show-app-murex.vercel.app/api/sms/twilio/inbound",
    );
  });
});
