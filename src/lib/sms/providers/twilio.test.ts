import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildTwilioWebhookUrl,
  getTwilioAuthToken,
  validateTwilioSignature,
} from "./twilio";
import { createHmac } from "crypto";

describe("buildTwilioWebhookUrl", () => {
  const ORIGINAL_URL = process.env.TWILIO_WEBHOOK_URL;

  afterEach(() => {
    if (ORIGINAL_URL === undefined) delete process.env.TWILIO_WEBHOOK_URL;
    else process.env.TWILIO_WEBHOOK_URL = ORIGINAL_URL;
  });

  it("uses x-forwarded proto and host on Vercel when no pin is set", () => {
    delete process.env.TWILIO_WEBHOOK_URL;
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

  it("uses TWILIO_WEBHOOK_URL pin instead of request headers when configured", () => {
    process.env.TWILIO_WEBHOOK_URL =
      "https://carshowscout.com/api/sms/twilio/inbound";
    const request = new Request(
      "http://localhost:3000/api/sms/twilio/inbound",
      {
        headers: {
          // Spoofed — must be ignored when pin is set.
          "x-forwarded-host": "evil.com",
          "x-forwarded-proto": "https",
        },
      },
    );
    expect(buildTwilioWebhookUrl(request)).toBe(
      "https://carshowscout.com/api/sms/twilio/inbound",
    );
  });
});

describe("getTwilioAuthToken", () => {
  const ORIGINAL_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) delete process.env.TWILIO_AUTH_TOKEN;
    else process.env.TWILIO_AUTH_TOKEN = ORIGINAL_TOKEN;
    // NODE_ENV is read-only in strict mode; skip restoration via Object.defineProperty.
  });

  it("returns null when token is absent in development", () => {
    delete process.env.TWILIO_AUTH_TOKEN;
    // NODE_ENV is 'test' in vitest, not 'production', so no throw expected.
    expect(getTwilioAuthToken()).toBeNull();
  });

  it("returns the configured token", () => {
    process.env.TWILIO_AUTH_TOKEN = "  ACtest  ";
    expect(getTwilioAuthToken()).toBe("ACtest");
  });

  it("throws in production when TWILIO_AUTH_TOKEN is absent", () => {
    delete process.env.TWILIO_AUTH_TOKEN;
    // Pass "production" as the nodeEnv override so NODE_ENV doesn't need mutation.
    expect(() => getTwilioAuthToken("production")).toThrow(/TWILIO_AUTH_TOKEN/);
  });
});

describe("validateTwilioSignature", () => {
  const AUTH_TOKEN = "secret123";
  const URL = "https://carshowscout.com/api/sms/twilio/inbound";
  const PARAMS = { Body: "vote", From: "+15551234567", To: "+15557654321" };

  function computeSignature(
    token: string,
    url: string,
    params: Record<string, string>,
  ): string {
    const sorted = Object.keys(params).sort();
    let data = url;
    for (const key of sorted) data += key + params[key];
    return createHmac("sha1", token).update(data).digest("base64");
  }

  it("accepts a valid Twilio signature", () => {
    const sig = computeSignature(AUTH_TOKEN, URL, PARAMS);
    expect(validateTwilioSignature(AUTH_TOKEN, sig, URL, PARAMS)).toBe(true);
  });

  it("rejects an invalid signature", () => {
    expect(
      validateTwilioSignature(AUTH_TOKEN, "bad-signature", URL, PARAMS),
    ).toBe(false);
  });

  it("rejects a valid signature computed over a different URL", () => {
    const sig = computeSignature(AUTH_TOKEN, "https://evil.com/inbound", PARAMS);
    expect(validateTwilioSignature(AUTH_TOKEN, sig, URL, PARAMS)).toBe(false);
  });
});
