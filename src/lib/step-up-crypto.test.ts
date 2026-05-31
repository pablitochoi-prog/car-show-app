import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  hashOtpCode,
  verifyOtpCode,
  signStepUpCookie,
  verifyStepUpCookie,
  maskEmail,
} from "./step-up-crypto";

describe("step-up-crypto", () => {
  const originalSecret = process.env.STEP_UP_COOKIE_SECRET;

  beforeEach(() => {
    process.env.STEP_UP_COOKIE_SECRET = "test-step-up-secret";
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.STEP_UP_COOKIE_SECRET;
    } else {
      process.env.STEP_UP_COOKIE_SECRET = originalSecret;
    }
  });

  it("hashes and verifies OTP codes", () => {
    const hash = hashOtpCode("123456");
    expect(verifyOtpCode("123456", hash)).toBe(true);
    expect(verifyOtpCode("000000", hash)).toBe(false);
  });

  it("signs and verifies step-up cookies", () => {
    const token = signStepUpCookie({
      userId: "u1",
      sessionId: "s1",
      purpose: "ORGANIZER_STEP_UP",
      verifiedAt: Date.now(),
    });
    const payload = verifyStepUpCookie(token);
    expect(payload?.userId).toBe("u1");
    expect(payload?.sessionId).toBe("s1");
    expect(verifyStepUpCookie("tampered")).toBe(null);
  });

  it("masks email addresses", () => {
    expect(maskEmail("organizer@example.com")).toMatch(/o•+r@e•+e\.com/);
  });
});
