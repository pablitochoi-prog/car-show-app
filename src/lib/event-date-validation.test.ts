import { describe, expect, it } from "vitest";
import {
  isInstantInPast,
  nullIfCalendarDateInPast,
  nullIfInstantInPast,
  sanitizeDailyHoursPastDates,
  validateEventScheduleDatesNotInPast,
  validateSmsVotingWindowNotInPast,
  validateTierWindowNotInPast,
} from "./event-date-validation";
import { isEventPlatformBillingConfigured } from "./event-platform-fee";

describe("isEventPlatformBillingConfigured", () => {
  it("treats cloned events with inherited billing as configured", () => {
    expect(
      isEventPlatformBillingConfigured({
        paymentEnabled: false,
        clonedFromId: "evt-source",
      }),
    ).toBe(true);
  });

  it("requires paymentEnabled for non-cloned events", () => {
    expect(
      isEventPlatformBillingConfigured({
        paymentEnabled: false,
        clonedFromId: null,
      }),
    ).toBe(false);
  });
});

describe("nullIfInstantInPast", () => {
  it("clears past instants", () => {
    const past = new Date("2020-01-01T12:00:00.000Z");
    expect(nullIfInstantInPast(past)).toBeNull();
  });

  it("keeps future instants", () => {
    const future = new Date(Date.now() + 86_400_000);
    expect(nullIfInstantInPast(future)?.getTime()).toBe(future.getTime());
  });
});

describe("validateTierWindowNotInPast", () => {
  it("rejects past tier open dates", () => {
    expect(
      validateTierWindowNotInPast({
        opensAt: "2020-01-01T12:00:00.000Z",
        closesAt: null,
      }),
    ).toContain("open");
  });
});

describe("validateSmsVotingWindowNotInPast", () => {
  it("ignores voting dates when SMS voting is disabled", () => {
    expect(
      validateSmsVotingWindowNotInPast({
        smsVotingEnabled: false,
        smsVotingStartsAt: "2020-01-01T12:00:00.000Z",
        smsVotingEndsAt: null,
      }),
    ).toBeNull();
  });

  it("rejects past SMS voting start when enabled", () => {
    expect(
      validateSmsVotingWindowNotInPast({
        smsVotingEnabled: true,
        smsVotingStartsAt: "2020-01-01T12:00:00.000Z",
        smsVotingEndsAt: null,
      }),
    ).toContain("start");
  });
});

describe("sanitizeDailyHoursPastDates", () => {
  it("clears past schedule row dates", () => {
    const out = sanitizeDailyHoursPastDates([
      { date: "2020-01-01", startTime: "09:00" },
      { date: "2099-12-31", startTime: "09:00" },
    ]);
    expect(out?.[0]).toMatchObject({ date: "" });
    expect(out?.[1]).toMatchObject({ date: "2099-12-31" });
  });
});

describe("nullIfCalendarDateInPast", () => {
  it("clears past calendar dates", () => {
    expect(
      nullIfCalendarDateInPast(new Date("2020-01-01T12:00:00.000Z")),
    ).toBeNull();
  });
});

describe("isInstantInPast", () => {
  it("returns false for null", () => {
    expect(isInstantInPast(null)).toBe(false);
  });
});

describe("validateEventScheduleDatesNotInPast", () => {
  it("rejects past rain dates", () => {
    expect(
      validateEventScheduleDatesNotInPast({ rainDate: "2020-01-01" }),
    ).toContain("Rain date");
  });
});
