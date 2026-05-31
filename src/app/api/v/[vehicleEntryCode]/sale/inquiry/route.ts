import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendVehicleSaleInquiryEmail } from "@/lib/email/sendgrid";
import { loadActiveVehicleSaleListingForInquiry } from "@/lib/public-vehicle-sale-listing";
import { getSiteOrigin } from "@/lib/site-url";
import {
  buildSmsNotificationsConsentFields,
  buildUserSmsNotificationsConsentUpdate,
  resolveRequestClientMetadata,
  SMS_NOTIFICATIONS_OPT_IN_SOURCES,
  userHasActiveSmsNotificationsOptIn,
} from "@/lib/sms-notifications-consent";
import { notifyVehicleSaleInquirySms } from "@/lib/sms/vehicle-sale-inquiry-sms";
import { hashSaleInquiryClientValue } from "@/lib/vehicle-sale-inquiry-client-hash";
import { checkVehicleSaleInquiryRateLimit } from "@/lib/vehicle-sale-inquiry-rate-limit";
import { sellerDashboardInquiryUrl } from "@/lib/vehicle-sale-inquiries-for-seller";
import { parseListingPriceCents } from "@/lib/validation/vehicle-sale-listing";
import {
  BELOW_OFFER_INQUIRY_MESSAGE,
  INQUIRIES_CLOSED_API_MESSAGE,
} from "@/lib/vehicle-sale-inquiry-messages";
import { sendVehicleSaleInquiryInAppMessage } from "@/lib/vehicle-sale-inquiry-in-app-message";
import { vehicleSaleInquirySchema, formatVehicleSaleInquiryBuyerName, normalizeInquiryMessage } from "@/lib/validation/vehicle-sale-inquiry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ vehicleEntryCode: string }>;
};

function resolveSellerEmail(reg: {
  user: { email: string } | null;
  guestEmail: string | null;
  registrantEmail: string | null;
}): string | null {
  return (
    reg.user?.email?.trim() ||
    reg.registrantEmail?.trim() ||
    reg.guestEmail?.trim() ||
    null
  );
}

function resolveSellerName(reg: {
  user: { name: string } | null;
  guestFirstName: string | null;
  guestLastName: string | null;
  registrantFirstName: string | null;
  registrantLastName: string | null;
}): string {
  if (reg.user?.name?.trim()) return reg.user.name.trim();
  const guest = [reg.guestFirstName, reg.guestLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (guest) return guest;
  const registrant = [reg.registrantFirstName, reg.registrantLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return registrant || "Vehicle owner";
}

function resolveSellerPhone(reg: {
  user: { phone: string | null } | null;
  guestPhone: string | null;
  registrantPhone: string | null;
}): string | null {
  return (
    reg.user?.phone?.trim() ||
    reg.registrantPhone?.trim() ||
    reg.guestPhone?.trim() ||
    null
  );
}

export async function POST(request: Request, { params }: RouteParams) {
  const { vehicleEntryCode } = await params;
  const currentUser = await getCurrentUser();
  const clientMeta = resolveRequestClientMetadata(request);
  const loaded = await loadActiveVehicleSaleListingForInquiry(vehicleEntryCode);
  if (!loaded) {
    return NextResponse.json(
      { error: INQUIRIES_CLOSED_API_MESSAGE },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = vehicleSaleInquirySchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "Please check your inquiry details.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  const offerCents = loaded.listing.allowOffers
    ? parseListingPriceCents(parsed.data.offerAmountDollars)
    : null;

  if (
    offerCents != null &&
    loaded.listing.minimumOfferCents != null &&
    offerCents < loaded.listing.minimumOfferCents
  ) {
    return NextResponse.json(
      { error: BELOW_OFFER_INQUIRY_MESSAGE },
      { status: 400 },
    );
  }

  const ip =
    clientMeta.ipAddress ||
    "";
  const userAgent = clientMeta.userAgent || "";
  const ipHash = ip ? hashSaleInquiryClientValue(ip) : null;
  const userAgentHash = userAgent
    ? hashSaleInquiryClientValue(userAgent)
    : null;

  const rateLimit = await checkVehicleSaleInquiryRateLimit({
    listingId: loaded.listing.id,
    buyerEmail: parsed.data.buyerEmail,
    ipHash,
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: rateLimit.error }, { status: 429 });
  }

  const buyerName = formatVehicleSaleInquiryBuyerName(parsed.data);
  const now = new Date();
  const smsConsent = buildSmsNotificationsConsentFields({
    optIn: parsed.data.smsNotificationsOptIn ?? false,
    phone: parsed.data.buyerPhone,
    source: SMS_NOTIFICATIONS_OPT_IN_SOURCES.buyerInterestForm,
    ipAddress: clientMeta.ipAddress,
    userAgent: clientMeta.userAgent,
  });

  const inquiry = await prisma.vehicleSaleInquiry.create({
    data: {
      listingId: loaded.listing.id,
      eventId: loaded.listing.eventId,
      sellerUserId: loaded.listing.sellerUserId,
      registrationVehicleId: loaded.listing.registrationVehicleId,
      guestVehicleIndex: loaded.listing.guestVehicleIndex,
      buyerName,
      buyerEmail: parsed.data.buyerEmail.toLowerCase(),
      buyerPhone: parsed.data.buyerPhone?.trim() || null,
      offerAmountCents: offerCents,
      message: normalizeInquiryMessage(parsed.data.message),
      consentAt: now,
      ...smsConsent,
      ipHash,
      userAgentHash,
    },
  });

  if (currentUser && parsed.data.smsNotificationsOptIn) {
    await prisma.user.update({
      where: { id: currentUser.id },
      data: buildUserSmsNotificationsConsentUpdate({
        optIn: true,
        phone: parsed.data.buyerPhone ?? currentUser.phone,
        source: SMS_NOTIFICATIONS_OPT_IN_SOURCES.buyerInterestForm,
        previouslyOptedIn: userHasActiveSmsNotificationsOptIn(currentUser),
        ...clientMeta,
      }),
    });
  }

  const vehicleLabel = [
    loaded.entry.year > 0 ? loaded.entry.year : null,
    loaded.entry.make,
    loaded.entry.model,
  ]
    .filter(Boolean)
    .join(" ");

  await sendVehicleSaleInquiryInAppMessage({
    inquiryId: inquiry.id,
    sellerUserId: loaded.listing.sellerUserId,
    eventId: loaded.listing.eventId,
    orgId: loaded.listing.event.orgId,
    eventShowNumber: loaded.listing.event.showNumber,
    eventName: loaded.listing.event.name,
    vehicleLabel,
    vehicleEntryCode: loaded.entry.vehicleEntryCode,
    buyerName: inquiry.buyerName,
    buyerEmail: inquiry.buyerEmail,
    buyerPhone: inquiry.buyerPhone,
    smsNotificationsOptIn: inquiry.smsNotificationsOptIn,
    offerAmountCents: inquiry.offerAmountCents,
    message: inquiry.message,
    currentUserId: currentUser?.id ?? null,
    registration: loaded.listing.registration,
  });

  const sellerEmail = resolveSellerEmail(loaded.listing.registration);
  const inquiryDetailUrl = loaded.listing.sellerUserId
    ? `${getSiteOrigin()}${sellerDashboardInquiryUrl(inquiry.id)}`
    : null;
  let status: "SENT_TO_OWNER" | "FAILED_TO_SEND" = "FAILED_TO_SEND";

  if (sellerEmail) {
    const emailResult = await sendVehicleSaleInquiryEmail({
      to: sellerEmail,
      sellerName: resolveSellerName(loaded.listing.registration),
      eventName: loaded.listing.event.name,
      eventShowNumber: loaded.listing.event.showNumber,
      vehicleEntryCode: loaded.entry.vehicleEntryCode,
      vehicleLabel,
      buyerName: inquiry.buyerName,
      buyerEmail: inquiry.buyerEmail,
      buyerPhone: inquiry.buyerPhone,
      smsNotificationsOptIn: inquiry.smsNotificationsOptIn,
      offerAmountCents: inquiry.offerAmountCents,
      message: inquiry.message,
      inquiryDetailUrl,
    });

    if (emailResult.sent) {
      status = "SENT_TO_OWNER";
      await prisma.vehicleSaleInquiry.update({
        where: { id: inquiry.id },
        data: {
          status,
          notificationEmailSentAt: new Date(),
        },
      });
    } else {
      await prisma.vehicleSaleInquiry.update({
        where: { id: inquiry.id },
        data: { status },
      });
    }
  }

  const smsResult = await notifyVehicleSaleInquirySms({
    inquiryId: inquiry.id,
    sellerPhone: resolveSellerPhone(loaded.listing.registration),
    vehicleEntryCode: loaded.entry.vehicleEntryCode,
    buyerName: inquiry.buyerName,
  });
  if (smsResult.sent) {
    await prisma.vehicleSaleInquiry.update({
      where: { id: inquiry.id },
      data: { notificationSmsSentAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true, inquiryId: inquiry.id, status });
}
