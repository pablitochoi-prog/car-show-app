import { describe, expect, it } from "vitest";
import { mfaEnrollErrorMessage, totpQrCodeDataUrl } from "@/lib/mfa-session";

describe("mfaEnrollErrorMessage", () => {
  it("maps factor limit errors", () => {
    expect(mfaEnrollErrorMessage("Enrolled factors exceed allowed limit")).toContain(
      "previous setup",
    );
  });

  it("maps disabled MFA errors", () => {
    expect(mfaEnrollErrorMessage("MFA is not enabled")).toContain("Supabase");
  });

  it("falls back to generic message", () => {
    expect(mfaEnrollErrorMessage("something else")).toContain("Try again");
  });
});

describe("totpQrCodeDataUrl", () => {
  it("passes through Supabase-prefixed data URLs unchanged", () => {
    const fromSupabase =
      'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    expect(totpQrCodeDataUrl(fromSupabase)).toBe(fromSupabase);
  });

  it("wraps raw SVG markup", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    expect(totpQrCodeDataUrl(svg)).toBe(
      `data:image/svg+xml;utf-8,${encodeURIComponent(svg)}`,
    );
  });
});
