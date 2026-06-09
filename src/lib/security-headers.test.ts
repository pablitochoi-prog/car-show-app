import { describe, expect, it } from "vitest";
import { buildSecurityHeaders, CSP_REPORT_ONLY } from "./security-headers";

describe("buildSecurityHeaders", () => {
  describe("baseline headers present in all environments", () => {
    const headers = buildSecurityHeaders(false);
    const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]));

    it("includes X-Frame-Options: DENY", () => {
      expect(byKey["X-Frame-Options"]).toBe("DENY");
    });

    it("includes X-Content-Type-Options: nosniff", () => {
      expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    });

    it("includes Referrer-Policy", () => {
      expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    });

    it("includes Permissions-Policy with no camera/mic/geolocation", () => {
      const val = byKey["Permissions-Policy"] ?? "";
      expect(val).toContain("camera=()");
      expect(val).toContain("microphone=()");
      expect(val).toContain("geolocation=()");
    });

    it("includes Content-Security-Policy-Report-Only", () => {
      expect(byKey["Content-Security-Policy-Report-Only"]).toBeTruthy();
    });

    it("does NOT include Strict-Transport-Security in non-production", () => {
      expect(byKey["Strict-Transport-Security"]).toBeUndefined();
    });
  });

  describe("HSTS in production", () => {
    it("includes Strict-Transport-Security with correct value", () => {
      const headers = buildSecurityHeaders(true);
      const hsts = headers.find((h) => h.key === "Strict-Transport-Security");
      expect(hsts).toBeDefined();
      expect(hsts?.value).toBe("max-age=63072000; includeSubDomains; preload");
    });
  });
});

describe("CSP_REPORT_ONLY directive coverage", () => {
  it("restricts default-src to self", () => {
    expect(CSP_REPORT_ONLY).toContain("default-src 'self'");
  });

  it("allows Stripe scripts", () => {
    expect(CSP_REPORT_ONLY).toContain("https://js.stripe.com");
  });

  it("allows Stripe iframes (frame-src)", () => {
    expect(CSP_REPORT_ONLY).toContain("frame-src");
    expect(CSP_REPORT_ONLY).toContain("https://js.stripe.com");
    expect(CSP_REPORT_ONLY).toContain("https://hooks.stripe.com");
    expect(CSP_REPORT_ONLY).toContain("https://checkout.stripe.com");
  });

  it("allows Supabase API and WebSocket connections", () => {
    expect(CSP_REPORT_ONLY).toContain("https://*.supabase.co");
    expect(CSP_REPORT_ONLY).toContain("wss://*.supabase.co");
  });

  it("allows Stripe API connections", () => {
    expect(CSP_REPORT_ONLY).toContain("https://api.stripe.com");
  });

  it("allows R2 public photo domain for images", () => {
    expect(CSP_REPORT_ONLY).toContain("https://photos.carshowscout.com");
  });

  it("allows Supabase storage images", () => {
    // Covered by the *.supabase.co wildcard in img-src.
    expect(CSP_REPORT_ONLY).toMatch(/img-src[^;]*https:\/\/\*\.supabase\.co/);
  });

  it("allows Sentry ingest connections", () => {
    expect(CSP_REPORT_ONLY).toContain("https://*.ingest.sentry.io");
  });

  it("disallows object embeds", () => {
    expect(CSP_REPORT_ONLY).toContain("object-src 'none'");
  });

  it("restricts base-uri and form-action to self", () => {
    expect(CSP_REPORT_ONLY).toContain("base-uri 'self'");
    expect(CSP_REPORT_ONLY).toContain("form-action 'self'");
  });

  it("disallows framing by third parties (frame-ancestors none)", () => {
    expect(CSP_REPORT_ONLY).toContain("frame-ancestors 'none'");
  });
});
