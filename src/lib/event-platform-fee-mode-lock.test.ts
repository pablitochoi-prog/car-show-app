import { describe, expect, it } from "vitest";
import {
  isPlatformFeeModeLocked,
  platformFeeModeLockReason,
  validatePlatformFeeModeChange,
} from "@/lib/event-platform-fee-mode-lock";

describe("event-platform-fee-mode-lock", () => {
  it("locks after flat platform fee is paid", () => {
    expect(
      isPlatformFeeModeLocked({
        status: "DRAFT",
        platformSetupFeeCollected: true,
      }),
    ).toBe(true);
  });

  it("locks when event is live for registration", () => {
    expect(
      isPlatformFeeModeLocked({
        status: "PUBLISHED",
        platformSetupFeeCollected: false,
      }),
    ).toBe(true);
    expect(
      isPlatformFeeModeLocked({
        status: "ACTIVE",
        platformSetupFeeCollected: false,
      }),
    ).toBe(true);
  });

  it("allows changes on draft events before flat fee is paid", () => {
    expect(
      isPlatformFeeModeLocked({
        status: "DRAFT",
        platformSetupFeeCollected: false,
      }),
    ).toBe(false);
  });

  it("rejects switching from convenience to flat after publish", () => {
    const error = validatePlatformFeeModeChange({
      status: "PUBLISHED",
      platformFeeMode: "CONVENIENCE",
      platformSetupFeeCollected: false,
      nextMode: "FLAT_EVENT",
    });
    expect(error).toContain("live for registration");
  });

  it("rejects any mode change after flat fee is paid", () => {
    const error = validatePlatformFeeModeChange({
      status: "DRAFT",
      platformFeeMode: "FLAT_EVENT",
      platformSetupFeeCollected: true,
      nextMode: "CONVENIENCE",
    });
    expect(error).toContain("flat platform fee has been paid");
  });

  it("allows saving the same mode when locked", () => {
    expect(
      validatePlatformFeeModeChange({
        status: "PUBLISHED",
        platformFeeMode: "CONVENIENCE",
        platformSetupFeeCollected: false,
        nextMode: "CONVENIENCE",
      }),
    ).toBeNull();
  });

  it("returns lock reason messages", () => {
    expect(
      platformFeeModeLockReason({
        status: "PUBLISHED",
        platformSetupFeeCollected: false,
      }),
    ).toContain("published");
  });
});
