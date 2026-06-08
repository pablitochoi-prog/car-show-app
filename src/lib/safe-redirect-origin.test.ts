import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  isTrustedAppHost,
  resolveSafeRedirectOrigin,
} from "@/lib/safe-redirect-origin";

const ORIGINAL_ENV = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  VERCEL_URL: process.env.VERCEL_URL,
  VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
};

function restore(key: keyof typeof ORIGINAL_ENV) {
  const value = ORIGINAL_ENV[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

describe("safe-redirect-origin", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://carshowscout.com";
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_BRANCH_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  });

  afterEach(() => {
    (Object.keys(ORIGINAL_ENV) as (keyof typeof ORIGINAL_ENV)[]).forEach(restore);
  });

  describe("isTrustedAppHost", () => {
    it("accepts the canonical apex and true subdomains", () => {
      expect(isTrustedAppHost("carshowscout.com")).toBe(true);
      expect(isTrustedAppHost("app.carshowscout.com")).toBe(true);
    });

    it("accepts localhost in development", () => {
      expect(isTrustedAppHost("localhost:3000")).toBe(true);
      expect(isTrustedAppHost("127.0.0.1")).toBe(true);
    });

    it("rejects look-alike domains", () => {
      expect(isTrustedAppHost("evilcarshowscout.com")).toBe(false);
      expect(isTrustedAppHost("carshowscout.com.evil.com")).toBe(false);
    });

    it("rejects arbitrary vercel.app deployments", () => {
      expect(isTrustedAppHost("random123.vercel.app")).toBe(false);
    });

    it("accepts the current deployment's Vercel host when configured", () => {
      process.env.VERCEL_URL = "car-show-app-abc123.vercel.app";
      expect(isTrustedAppHost("car-show-app-abc123.vercel.app")).toBe(true);
      expect(isTrustedAppHost("other-project.vercel.app")).toBe(false);
    });

    it("rejects empty/missing hosts", () => {
      expect(isTrustedAppHost(null)).toBe(false);
      expect(isTrustedAppHost("")).toBe(false);
    });
  });

  describe("resolveSafeRedirectOrigin", () => {
    function req(headers: Record<string, string>): Request {
      return new Request("https://carshowscout.com/auth/callback", { headers });
    }

    it("ignores a spoofed x-forwarded-host and falls back to canonical", () => {
      expect(
        resolveSafeRedirectOrigin(req({ "x-forwarded-host": "evil.com" })),
      ).toBe("https://carshowscout.com");
    });

    it("honors an allowlisted x-forwarded-host", () => {
      expect(
        resolveSafeRedirectOrigin(
          req({
            "x-forwarded-host": "app.carshowscout.com",
            "x-forwarded-proto": "https",
          }),
        ),
      ).toBe("https://app.carshowscout.com");
    });

    it("falls back to canonical when no forwarded host is present", () => {
      expect(resolveSafeRedirectOrigin(req({}))).toBe("https://carshowscout.com");
    });
  });
});
