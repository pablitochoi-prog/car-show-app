import sgMail from "@sendgrid/mail";
import { formatEventShowNumber } from "@/lib/event-show-number";
import { richTextToPlainText } from "@/lib/listing-description-html";
import { formatUsdWholeDollars } from "@/lib/money";
import { sanitizePolicyHtml } from "@/lib/sanitize-policy-html";

export type EmailSendResult =
  | { sent: true; messageId?: string }
  | { sent: false; skipped: true; reason: string }
  | { sent: false; skipped: false; error: string };

type SendGridConfig = {
  apiKey: string;
  fromEmail: string;
  replyTo: string | null;
};

export type RegistrationConfirmationEmailInput = {
  to: string;
  recipientName?: string | null;
  eventName: string;
  eventShowNumber: number;
  eventDateLabel: string;
  venueLabel?: string | null;
  registrationUrl: string;
  /** When false, the email notes that payment is still pending. */
  confirmed: boolean;
};

export type PasswordResetEmailInput = {
  to: string;
  recipientName?: string | null;
  resetUrl: string;
  expiresInMinutes?: number;
};

export type EventReminderEmailInput = {
  to: string;
  recipientName?: string | null;
  eventName: string;
  eventShowNumber: number;
  eventDateLabel: string;
  eventTimeLabel?: string | null;
  venueLabel?: string | null;
  eventUrl: string;
};

function readSendGridConfig(): SendGridConfig | null {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  const fromEmail = process.env.SENDGRID_FROM_EMAIL?.trim();
  const replyTo = process.env.SENDGRID_REPLY_TO?.trim() || null;

  if (!apiKey || !fromEmail) {
    return null;
  }

  return { apiKey, fromEmail, replyTo };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function greeting(name?: string | null): string {
  const trimmed = name?.trim();
  return trimmed ? `Hi ${trimmed},` : "Hi,";
}

function eventLabel(name: string, showNumber: number): string {
  return `${formatEventShowNumber(showNumber)} ${name.trim()}`;
}

function skippedResult(reason: string): EmailSendResult {
  console.warn("[sendgrid]", reason);
  return { sent: false, skipped: true, reason };
}

function failedResult(error: string): EmailSendResult {
  console.error("[sendgrid]", error);
  return { sent: false, skipped: false, error };
}

async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<EmailSendResult> {
  const config = readSendGridConfig();
  if (!config) {
    return skippedResult(
      "SendGrid is not configured (SENDGRID_API_KEY and SENDGRID_FROM_EMAIL required).",
    );
  }

  const to = input.to.trim().toLowerCase();
  if (!to.includes("@")) {
    return failedResult(`Invalid recipient email: ${input.to}`);
  }

  sgMail.setApiKey(config.apiKey);

  try {
    const [response] = await sgMail.send({
      to,
      from: config.fromEmail,
      replyTo: config.replyTo ?? undefined,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    const messageId =
      typeof response.headers["x-message-id"] === "string"
        ? response.headers["x-message-id"]
        : undefined;

    return { sent: true, messageId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown SendGrid error";
    return failedResult(`Failed to send email to ${to}: ${message}`);
  }
}

/** Confirmation email after a user registers for an event. */
export async function sendRegistrationConfirmation(
  input: RegistrationConfirmationEmailInput,
): Promise<EmailSendResult> {
  const label = eventLabel(input.eventName, input.eventShowNumber);
  const venue = input.venueLabel?.trim();
  const statusLine = input.confirmed
    ? "Your registration is confirmed."
    : "Your registration is saved and pending payment.";

  const text = [
    greeting(input.recipientName),
    "",
    `Thank you for registering for ${label}.`,
    statusLine,
    `Date: ${input.eventDateLabel}`,
    venue ? `Location: ${venue}` : null,
    "",
    `View your registration: ${input.registrationUrl}`,
    "",
    "See you at the show!",
    "CarShowScout",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>${escapeHtml(greeting(input.recipientName))}</p>
    <p>Thank you for registering for <strong>${escapeHtml(label)}</strong>.</p>
    <p>${escapeHtml(statusLine)}</p>
    <p><strong>Date:</strong> ${escapeHtml(input.eventDateLabel)}</p>
    ${venue ? `<p><strong>Location:</strong> ${escapeHtml(venue)}</p>` : ""}
    <p><a href="${escapeHtml(input.registrationUrl)}">View your registration</a></p>
    <p>See you at the show!<br />CarShowScout</p>
  `.trim();

  return sendTransactionalEmail({
    to: input.to,
    subject: `Registration ${input.confirmed ? "confirmed" : "received"} — ${label}`,
    text,
    html,
  });
}

/** Password reset link email (server-side only). */
export async function sendPasswordResetEmail(
  input: PasswordResetEmailInput,
): Promise<EmailSendResult> {
  const expires = input.expiresInMinutes ?? 60;

  const text = [
    greeting(input.recipientName),
    "",
    "We received a request to reset your CarShowScout password.",
    `Reset your password: ${input.resetUrl}`,
    "",
    `This link expires in ${expires} minutes.`,
    "If you did not request this, you can ignore this email.",
    "",
    "CarShowScout",
  ].join("\n");

  const html = `
    <p>${escapeHtml(greeting(input.recipientName))}</p>
    <p>We received a request to reset your CarShowScout password.</p>
    <p><a href="${escapeHtml(input.resetUrl)}">Reset your password</a></p>
    <p>This link expires in ${expires} minutes.</p>
    <p>If you did not request this, you can ignore this email.</p>
    <p>CarShowScout</p>
  `.trim();

  return sendTransactionalEmail({
    to: input.to,
    subject: "Reset your CarShowScout password",
    text,
    html,
  });
}

/** Reminder email before an upcoming event. */
export async function sendEventReminder(
  input: EventReminderEmailInput,
): Promise<EmailSendResult> {
  const label = eventLabel(input.eventName, input.eventShowNumber);
  const venue = input.venueLabel?.trim();
  const when = [input.eventDateLabel, input.eventTimeLabel?.trim()]
    .filter(Boolean)
    .join(" · ");

  const text = [
    greeting(input.recipientName),
    "",
    `This is a reminder for ${label}.`,
    when ? `When: ${when}` : null,
    venue ? `Where: ${venue}` : null,
    "",
    `Event details: ${input.eventUrl}`,
    "",
    "CarShowScout",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>${escapeHtml(greeting(input.recipientName))}</p>
    <p>This is a reminder for <strong>${escapeHtml(label)}</strong>.</p>
    ${when ? `<p><strong>When:</strong> ${escapeHtml(when)}</p>` : ""}
    ${venue ? `<p><strong>Where:</strong> ${escapeHtml(venue)}</p>` : ""}
    <p><a href="${escapeHtml(input.eventUrl)}">View event details</a></p>
    <p>CarShowScout</p>
  `.trim();

  return sendTransactionalEmail({
    to: input.to,
    subject: `Reminder — ${label}`,
    text,
    html,
  });
}

/** Whether SendGrid env vars are present (for server-side feature checks). */
export function isSendGridConfigured(): boolean {
  return readSendGridConfig() !== null;
}

/** Temporary admin test email — fixed subject and body. */
export async function sendTestEmail(input: {
  to: string;
}): Promise<EmailSendResult> {
  const body = "This is a test email from CarShowScout.";
  return sendTransactionalEmail({
    to: input.to,
    subject: "CarShowScout SendGrid Test",
    text: body,
    html: `<p>${escapeHtml(body)}</p>`,
  });
}

export type OrganizerStepUpOtpEmailInput = {
  to: string;
  recipientName?: string | null;
  code: string;
  expiresInMinutes?: number;
};

/** One-time email OTP for event staff accessing sensitive management areas. */
export async function sendOrganizerStepUpOtpEmail(
  input: OrganizerStepUpOtpEmailInput,
): Promise<EmailSendResult> {
  const expires = input.expiresInMinutes ?? 10;

  const text = [
    greeting(input.recipientName),
    "",
    "For your attendees' privacy, verify your account before accessing event management information.",
    "",
    `Your verification code is: ${input.code}`,
    "",
    `This code expires in ${expires} minutes.`,
    "If you did not request this code, you can ignore this email.",
    "",
    "CarShowScout",
  ].join("\n");

  const html = `
    <p>${escapeHtml(greeting(input.recipientName))}</p>
    <p>For your attendees' privacy, verify your account before accessing event management information.</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:0.2em;">${escapeHtml(input.code)}</p>
    <p>This code expires in ${expires} minutes.</p>
    <p>If you did not request this code, you can ignore this email.</p>
    <p>CarShowScout</p>
  `.trim();

  return sendTransactionalEmail({
    to: input.to,
    subject: "Your CarShowScout organizer verification code",
    text,
    html,
  });
}

export type VehicleSaleInquiryEmailInput = {
  to: string;
  sellerName: string;
  eventName: string;
  eventShowNumber: number;
  vehicleEntryCode: string;
  vehicleLabel: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  smsNotificationsOptIn?: boolean;
  offerAmountCents: number | null;
  message: string | null;
  /** Logged-in sellers get a dashboard link; guest sellers receive email details only. */
  inquiryDetailUrl?: string | null;
};

/** Notify a vehicle owner that a buyer submitted an inquiry from a dash-card QR. */
export async function sendVehicleSaleInquiryEmail(
  input: VehicleSaleInquiryEmailInput,
): Promise<EmailSendResult> {
  const showLabel = eventLabel(input.eventName, input.eventShowNumber);
  const offerLine =
    input.offerAmountCents != null
      ? `Offer: ${formatUsdWholeDollars(input.offerAmountCents / 100)}`
      : null;

  const dashboardLine = input.inquiryDetailUrl
    ? `View in your dashboard: ${input.inquiryDetailUrl}`
    : null;

  const messagePlain = input.message?.trim()
    ? richTextToPlainText(input.message.trim())
    : null;
  const messageHtml = input.message?.trim()
    ? sanitizePolicyHtml(input.message.trim())
    : null;

  const textParts = [
    greeting(input.sellerName),
    "",
    `A buyer submitted an inquiry about your vehicle at ${showLabel}.`,
    "",
    `Vehicle: ${input.vehicleLabel} (${input.vehicleEntryCode})`,
    "",
    `From: ${input.buyerName}`,
    `Email: ${input.buyerEmail}`,
    input.buyerPhone ? `Phone: ${input.buyerPhone}` : null,
    input.smsNotificationsOptIn ? "SMS opt-in: Yes" : null,
    offerLine,
    messagePlain ? "" : null,
    messagePlain ? `Message:\n${messagePlain}` : null,
    dashboardLine,
    "",
    "Reply directly to the buyer using the contact details above.",
    "CarShowScout is not a broker, dealer, escrow provider, inspector, or appraiser.",
    "",
    "CarShowScout",
  ].filter((line): line is string => line != null);

  const htmlParts = [
    `<p>${escapeHtml(greeting(input.sellerName))}</p>`,
    `<p>A buyer submitted an inquiry about your vehicle at <strong>${escapeHtml(showLabel)}</strong>.</p>`,
    `<p><strong>Vehicle:</strong> ${escapeHtml(input.vehicleLabel)} (${escapeHtml(input.vehicleEntryCode)})</p>`,
    `<p><strong>From:</strong> ${escapeHtml(input.buyerName)}<br>`,
    `<strong>Email:</strong> ${escapeHtml(input.buyerEmail)}`,
    input.buyerPhone
      ? `<br><strong>Phone:</strong> ${escapeHtml(input.buyerPhone)}`
      : "",
    input.smsNotificationsOptIn
      ? `<br><strong>SMS opt-in:</strong> Yes`
      : "",
    "</p>",
    offerLine
      ? `<p><strong>${escapeHtml(offerLine)}</strong></p>`
      : "",
    messageHtml
      ? `<p><strong>Message:</strong></p><div class="policy-content">${messageHtml}</div>`
      : "",
    input.inquiryDetailUrl
      ? `<p><a href="${escapeHtml(input.inquiryDetailUrl)}">View inquiry in your CarShowScout dashboard</a></p>`
      : "",
    `<p>Reply directly to the buyer using the contact details above.</p>`,
    `<p>CarShowScout is not a broker, dealer, escrow provider, inspector, or appraiser.</p>`,
    `<p>CarShowScout</p>`,
  ];

  return sendTransactionalEmail({
    to: input.to,
    subject: `Buyer inquiry: ${input.vehicleEntryCode} at ${showLabel}`,
    text: textParts.join("\n"),
    html: htmlParts.join("\n"),
  });
}
