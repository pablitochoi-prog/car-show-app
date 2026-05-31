import { describe, expect, it } from "vitest";
import {
  buildSmsNotificationsConsentFields,
  buildUserSmsNotificationsConsentUpdate,
  SMS_NOTIFICATIONS_CONSENT_TEXT_VERSION,
  SMS_NOTIFICATIONS_OPT_IN_SOURCES,
  userHasActiveSmsNotificationsOptIn,
} from "@/lib/sms-notifications-consent";

describe("buildSmsNotificationsConsentFields", () => {
  it("clears consent metadata when unchecked", () => {
    const fields = buildSmsNotificationsConsentFields({
      optIn: false,
      phone: "(818) 555-0100",
      source: SMS_NOTIFICATIONS_OPT_IN_SOURCES.eventRegistration,
    });
    expect(fields.smsNotificationsOptIn).toBe(false);
    expect(fields.smsNotificationsOptInAt).toBeNull();
    expect(fields.smsNotificationsConsentTextVersion).toBeNull();
  });

  it("stores consent metadata when checked", () => {
    const fields = buildSmsNotificationsConsentFields({
      optIn: true,
      phone: "(818) 555-0100",
      source: SMS_NOTIFICATIONS_OPT_IN_SOURCES.buyerInterestForm,
      ipAddress: "127.0.0.1",
      userAgent: "TestAgent/1.0",
    });
    expect(fields.smsNotificationsOptIn).toBe(true);
    expect(fields.smsNotificationsOptInAt).toBeInstanceOf(Date);
    expect(fields.smsNotificationsOptInSource).toBe("buyer_interest_form");
    expect(fields.smsNotificationsOptInPhone).toBe("(818) 555-0100");
    expect(fields.smsNotificationsOptInIpAddress).toBe("127.0.0.1");
    expect(fields.smsNotificationsOptInUserAgent).toBe("TestAgent/1.0");
    expect(fields.smsNotificationsConsentTextVersion).toBe(
      SMS_NOTIFICATIONS_CONSENT_TEXT_VERSION,
    );
  });
});

describe("userHasActiveSmsNotificationsOptIn", () => {
  it("returns true when opted in and not opted out", () => {
    expect(
      userHasActiveSmsNotificationsOptIn({
        smsNotificationsOptIn: true,
        smsNotificationsOptOutAt: null,
      }),
    ).toBe(true);
  });

  it("returns false when never opted in", () => {
    expect(
      userHasActiveSmsNotificationsOptIn({
        smsNotificationsOptIn: false,
        smsNotificationsOptOutAt: null,
      }),
    ).toBe(false);
  });

  it("returns false after opt-out even when opt-in flag remains true", () => {
    expect(
      userHasActiveSmsNotificationsOptIn({
        smsNotificationsOptIn: true,
        smsNotificationsOptOutAt: new Date(),
      }),
    ).toBe(false);
  });
});

describe("buildUserSmsNotificationsConsentUpdate", () => {
  it("records opt-out timestamp when unchecking after prior opt-in", () => {
    const update = buildUserSmsNotificationsConsentUpdate({
      optIn: false,
      phone: "(818) 555-0100",
      source: SMS_NOTIFICATIONS_OPT_IN_SOURCES.profile,
      previouslyOptedIn: true,
    });
    expect(update.smsNotificationsOptIn).toBe(false);
    expect(update.smsNotificationsOptOutAt).toBeInstanceOf(Date);
  });

  it("does not set opt-out timestamp when unchecking without prior opt-in", () => {
    const update = buildUserSmsNotificationsConsentUpdate({
      optIn: false,
      phone: null,
      source: SMS_NOTIFICATIONS_OPT_IN_SOURCES.profile,
      previouslyOptedIn: false,
    });
    expect(update.smsNotificationsOptIn).toBe(false);
    expect(update.smsNotificationsOptOutAt).toBeUndefined();
  });

  it("clears opt-out and stores consent metadata on re-opt-in", () => {
    const update = buildUserSmsNotificationsConsentUpdate({
      optIn: true,
      phone: "(818) 555-0100",
      source: SMS_NOTIFICATIONS_OPT_IN_SOURCES.eventRegistration,
      previouslyOptedIn: false,
    });
    expect(update.smsNotificationsOptIn).toBe(true);
    expect(update.smsNotificationsOptOutAt).toBeNull();
    expect(update.smsNotificationsOptInSource).toBe("event_registration");
    expect(update.smsNotificationsConsentTextVersion).toBe(
      SMS_NOTIFICATIONS_CONSENT_TEXT_VERSION,
    );
  });
});
