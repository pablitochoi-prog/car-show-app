import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isSendGridConfigured,
  sendEventReminder,
  sendPasswordResetEmail,
  sendRegistrationConfirmation,
} from "./sendgrid";

describe("sendgrid email service", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
    vi.restoreAllMocks();
  });

  it("reports unconfigured when env vars are missing", () => {
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_FROM_EMAIL;
    expect(isSendGridConfigured()).toBe(false);
  });

  it("skips registration confirmation when SendGrid is not configured", async () => {
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_FROM_EMAIL;

    const result = await sendRegistrationConfirmation({
      to: "driver@example.com",
      eventName: "Radwood",
      eventShowNumber: 1001,
      eventDateLabel: "June 1, 2026",
      registrationUrl: "https://events.carshowscout.com/events/abc/register",
      confirmed: true,
    });

    expect(result.sent).toBe(false);
    if (!result.sent) {
      expect(result.skipped).toBe(true);
    }
  });

  it("skips password reset email when SendGrid is not configured", async () => {
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_FROM_EMAIL;

    const result = await sendPasswordResetEmail({
      to: "user@example.com",
      resetUrl: "https://events.carshowscout.com/reset",
    });

    expect(result.sent).toBe(false);
    if (!result.sent) {
      expect(result.skipped).toBe(true);
    }
  });

  it("skips event reminder when SendGrid is not configured", async () => {
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_FROM_EMAIL;

    const result = await sendEventReminder({
      to: "user@example.com",
      eventName: "Radwood",
      eventShowNumber: 1001,
      eventDateLabel: "June 1, 2026",
      eventUrl: "https://events.carshowscout.com/events/abc",
    });

    expect(result.sent).toBe(false);
    if (!result.sent) {
      expect(result.skipped).toBe(true);
    }
  });

  it("skips test email when SendGrid is not configured", async () => {
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_FROM_EMAIL;

    const { sendTestEmail } = await import("./sendgrid");
    const result = await sendTestEmail({ to: "admin@example.com" });

    expect(result.sent).toBe(false);
    if (!result.sent) {
      expect(result.skipped).toBe(true);
    }
  });
});
