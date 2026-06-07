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
      registrationUrl: "https://carshowscout.com/events/abc/register",
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
      resetUrl: "https://carshowscout.com/reset",
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
      eventUrl: "https://carshowscout.com/events/abc",
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

  it("skips vehicle sale inquiry email when SendGrid is not configured", async () => {
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_FROM_EMAIL;

    const { sendVehicleSaleInquiryEmail } = await import("./sendgrid");
    const result = await sendVehicleSaleInquiryEmail({
      to: "owner@example.com",
      sellerName: "Owner",
      eventName: "Desert Chrome",
      eventShowNumber: 1001,
      vehicleEntryCode: "AXY-001",
      vehicleLabel: "1959 Cadillac Eldorado",
      buyerName: "Jane Buyer",
      buyerEmail: "buyer@example.com",
      buyerPhone: "(818) 555-0100",
      offerAmountCents: 2_500_000,
      message: "Still available?",
      inquiryDetailUrl: "https://carshowscout.com/dashboard/sale-inquiries/abc",
    });

    expect(result.sent).toBe(false);
    if (!result.sent) {
      expect(result.skipped).toBe(true);
    }
  });
});
