import type { Prisma } from "@prisma/client";

export const SMS_NOTIFICATIONS_CONSENT_TEXT_VERSION = "2026-05-31-v1";

export const SMS_NOTIFICATIONS_OPT_IN_LABEL =
  "Send me SMS notifications regarding my event submission.";

export const SMS_NOTIFICATIONS_BUYER_INQUIRY_OPT_IN_LABEL =
  "Send me SMS alerts when someone submits a buyer inquiry about this vehicle.";

export const SMS_NOTIFICATIONS_OPT_IN_SOURCES = {
  eventRegistration: "event_registration",
  eventRegistrationBuyerInquiry: "event_registration_buyer_inquiry",
  buyerInterestForm: "buyer_interest_form",
  profile: "profile",
} as const;

export type SmsNotificationsOptInSource =
  (typeof SMS_NOTIFICATIONS_OPT_IN_SOURCES)[keyof typeof SMS_NOTIFICATIONS_OPT_IN_SOURCES];

export type SmsNotificationsConsentFields = {
  smsNotificationsOptIn: boolean;
  smsNotificationsOptInAt: Date | null;
  smsNotificationsOptInSource: string | null;
  smsNotificationsOptInPhone: string | null;
  smsNotificationsOptInIpAddress: string | null;
  smsNotificationsOptInUserAgent: string | null;
  smsNotificationsOptOutAt: Date | null;
  smsNotificationsConsentTextVersion: string | null;
};

export function resolveRequestClientMetadata(request?: Request | null): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  if (!request) {
    return { ipAddress: null, userAgent: null };
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    null;
  const userAgent = request.headers.get("user-agent")?.trim() || null;

  return { ipAddress: ip, userAgent };
}

/** Build Prisma write payload for submission-level SMS consent. */
export function buildSmsNotificationsConsentFields(args: {
  optIn: boolean;
  phone: string | null | undefined;
  source: SmsNotificationsOptInSource;
  ipAddress?: string | null;
  userAgent?: string | null;
}): SmsNotificationsConsentFields {
  const phone = args.phone?.trim() || null;

  if (!args.optIn) {
    return {
      smsNotificationsOptIn: false,
      smsNotificationsOptInAt: null,
      smsNotificationsOptInSource: null,
      smsNotificationsOptInPhone: null,
      smsNotificationsOptInIpAddress: null,
      smsNotificationsOptInUserAgent: null,
      smsNotificationsOptOutAt: null,
      smsNotificationsConsentTextVersion: null,
    };
  }

  const now = new Date();
  return {
    smsNotificationsOptIn: true,
    smsNotificationsOptInAt: now,
    smsNotificationsOptInSource: args.source,
    smsNotificationsOptInPhone: phone,
    smsNotificationsOptInIpAddress: args.ipAddress?.trim() || null,
    smsNotificationsOptInUserAgent: args.userAgent?.trim() || null,
    smsNotificationsOptOutAt: null,
    smsNotificationsConsentTextVersion: SMS_NOTIFICATIONS_CONSENT_TEXT_VERSION,
  };
}

/** Profile-level opt-in/out with audit timestamps. */
export function buildUserSmsNotificationsConsentUpdate(args: {
  optIn: boolean;
  phone: string | null | undefined;
  source: SmsNotificationsOptInSource;
  ipAddress?: string | null;
  userAgent?: string | null;
  previouslyOptedIn?: boolean;
}): Prisma.UserUpdateInput {
  if (!args.optIn) {
    return {
      smsNotificationsOptIn: false,
      ...(args.previouslyOptedIn
        ? { smsNotificationsOptOutAt: new Date() }
        : {}),
    };
  }

  const consent = buildSmsNotificationsConsentFields(args);
  return {
    smsNotificationsOptIn: consent.smsNotificationsOptIn,
    smsNotificationsOptInAt: consent.smsNotificationsOptInAt,
    smsNotificationsOptInSource: consent.smsNotificationsOptInSource,
    smsNotificationsOptInPhone: consent.smsNotificationsOptInPhone,
    smsNotificationsOptInIpAddress: consent.smsNotificationsOptInIpAddress,
    smsNotificationsOptInUserAgent: consent.smsNotificationsOptInUserAgent,
    smsNotificationsOptOutAt: null,
    smsNotificationsConsentTextVersion:
      consent.smsNotificationsConsentTextVersion,
  };
}

export function userHasActiveSmsNotificationsOptIn(user: {
  smsNotificationsOptIn: boolean;
  smsNotificationsOptOutAt: Date | null;
}): boolean {
  return user.smsNotificationsOptIn && user.smsNotificationsOptOutAt == null;
}
