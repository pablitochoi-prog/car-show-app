import { describe, expect, it } from "vitest";
import { signupSchema } from "@/lib/validation/auth";
import {
  buildSmsNotificationsConsentFields,
  SIGNUP_SMS_OPT_IN_HEADLINE,
  SIGNUP_SMS_OPT_IN_POLICY_PATH,
  SMS_NOTIFICATIONS_OPT_IN_SOURCES,
} from "@/lib/sms-notifications-consent";

const validBase = {
  username: "roadster_57",
  firstName: "Jane",
  lastName: "Driver",
  email: "jane@example.com",
  password: "Secret1!",
  confirmPassword: "Secret1!",
};

describe("signupSchema SMS opt-in", () => {
  it("defaults smsNotificationsOptIn to false", () => {
    const result = signupSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.smsNotificationsOptIn).toBe(false);
    }
  });

  it("accepts signup when SMS opt-in is unchecked", () => {
    const result = signupSchema.safeParse({
      ...validBase,
      smsNotificationsOptIn: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepts signup when SMS opt-in is checked with phone", () => {
    const result = signupSchema.safeParse({
      ...validBase,
      phone: "8185550100",
      smsNotificationsOptIn: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.smsNotificationsOptIn).toBe(true);
      expect(result.data.phone).toBe("(818) 555-0100");
    }
  });

  it("requires phone when SMS opt-in is checked", () => {
    const result = signupSchema.safeParse({
      ...validBase,
      smsNotificationsOptIn: true,
    });
    expect(result.success).toBe(false);
  });

  it("still validates password match", () => {
    const result = signupSchema.safeParse({
      ...validBase,
      confirmPassword: "Other1!",
      smsNotificationsOptIn: false,
    });
    expect(result.success).toBe(false);
  });
});

describe("signup SMS policy copy constants", () => {
  it("links SMS Text Policy to /terms", () => {
    expect(SIGNUP_SMS_OPT_IN_POLICY_PATH).toBe("/terms");
    expect(SIGNUP_SMS_OPT_IN_HEADLINE).toContain("car event registration");
  });
});

describe("signup SMS consent persistence fields", () => {
  it("stores false when unchecked", () => {
    const fields = buildSmsNotificationsConsentFields({
      optIn: false,
      phone: "(818) 555-0100",
      source: SMS_NOTIFICATIONS_OPT_IN_SOURCES.signup,
    });
    expect(fields.smsNotificationsOptIn).toBe(false);
    expect(fields.smsNotificationsOptInAt).toBeNull();
    expect(fields.smsNotificationsOptInSource).toBeNull();
  });

  it("stores true with signup source when checked", () => {
    const fields = buildSmsNotificationsConsentFields({
      optIn: true,
      phone: "(818) 555-0100",
      source: SMS_NOTIFICATIONS_OPT_IN_SOURCES.signup,
      ipAddress: "127.0.0.1",
      userAgent: "Test/1.0",
    });
    expect(fields.smsNotificationsOptIn).toBe(true);
    expect(fields.smsNotificationsOptInAt).toBeInstanceOf(Date);
    expect(fields.smsNotificationsOptInSource).toBe("signup");
    expect(fields.smsNotificationsOptInPhone).toBe("(818) 555-0100");
  });
});
