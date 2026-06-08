import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

// Avoid module-load side effects (Stripe SDK / Prisma) that are irrelevant here.
vi.mock("@/lib/stripe", () => ({ stripe: {} }));
vi.mock("@/lib/db", () => ({ prisma: {} }));

import { resolveStripeAppOrigin } from "@/lib/stripe-connect";

const ORIGINAL_ENV = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  VERCEL_URL: process.env.VERCEL_URL,
};

describe("resolveStripeAppOrigin", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://carshowscout.com";
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    if (ORIGINAL_ENV.NEXT_PUBLIC_APP_URL === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_ENV.NEXT_PUBLIC_APP_URL;
    }
    if (ORIGINAL_ENV.VERCEL_URL === undefined) delete process.env.VERCEL_URL;
    else process.env.VERCEL_URL = ORIGINAL_ENV.VERCEL_URL;
  });

  it("accepts the canonical app origin and subdomains", () => {
    expect(resolveStripeAppOrigin("https://carshowscout.com")).toBe(
      "https://carshowscout.com",
    );
    expect(resolveStripeAppOrigin("https://app.carshowscout.com")).toBe(
      "https://app.carshowscout.com",
    );
  });

  it("rejects look-alike domains and falls back to canonical", () => {
    expect(resolveStripeAppOrigin("https://evilcarshowscout.com")).toBe(
      "https://carshowscout.com",
    );
  });

  it("rejects untrusted random vercel.app origins", () => {
    expect(resolveStripeAppOrigin("https://random123.vercel.app")).toBe(
      "https://carshowscout.com",
    );
  });

  it("accepts the current deployment's Vercel host when configured", () => {
    process.env.VERCEL_URL = "car-show-app-abc123.vercel.app";
    expect(
      resolveStripeAppOrigin("https://car-show-app-abc123.vercel.app"),
    ).toBe("https://car-show-app-abc123.vercel.app");
  });

  it("falls back to canonical for empty input", () => {
    expect(resolveStripeAppOrigin(null)).toBe("https://carshowscout.com");
    expect(resolveStripeAppOrigin("")).toBe("https://carshowscout.com");
  });
});
