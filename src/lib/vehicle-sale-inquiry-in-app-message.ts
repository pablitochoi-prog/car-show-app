import { prisma } from "@/lib/db";
import { formatEventShowNumber } from "@/lib/event-show-number";
import { richTextToPlainText } from "@/lib/listing-description-html";
import { formatUsdWholeDollars } from "@/lib/money";
import { getSiteAdminUserIds } from "@/lib/site-admin-users";
import { getSiteOrigin } from "@/lib/site-url";
import { sellerDashboardInquiryUrl } from "@/lib/vehicle-sale-inquiries-for-seller";

export function buildVehicleSaleInquiryMessageSubject(input: {
  vehicleEntryCode: string;
  eventShowNumber: number;
  eventName: string;
}): string {
  const showLabel = `${formatEventShowNumber(input.eventShowNumber)} ${input.eventName}`;
  return `Buyer inquiry: ${input.vehicleEntryCode} at ${showLabel}`;
}

export function buildVehicleSaleInquiryMessageBody(input: {
  eventShowNumber: number;
  eventName: string;
  vehicleLabel: string;
  vehicleEntryCode: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  smsNotificationsOptIn: boolean;
  offerAmountCents: number | null;
  message: string | null;
  inquiryDetailUrl: string | null;
}): string {
  const showLabel = `${formatEventShowNumber(input.eventShowNumber)} ${input.eventName}`;
  const offerLine =
    input.offerAmountCents != null
      ? `Offer: ${formatUsdWholeDollars(input.offerAmountCents / 100)}`
      : null;
  const messagePlain = input.message?.trim()
    ? richTextToPlainText(input.message.trim())
    : null;

  const lines = [
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
    input.inquiryDetailUrl
      ? `View in your dashboard: ${input.inquiryDetailUrl}`
      : null,
    "",
    "Reply directly to the buyer using the contact details above.",
    "CarShowScout is not a broker, dealer, escrow provider, inspector, or appraiser.",
  ].filter((line): line is string => line != null);

  return lines.join("\n");
}

async function resolveSellerRecipientUserId(input: {
  sellerUserId: string | null;
  registration: {
    userId: string | null;
    user: { id: string } | null;
    guestEmail: string | null;
    registrantEmail: string | null;
  };
}): Promise<string | null> {
  if (input.sellerUserId) return input.sellerUserId;

  let recipientUserId = input.registration.userId ?? input.registration.user?.id ?? null;
  if (recipientUserId) return recipientUserId;

  const email =
    input.registration.registrantEmail?.trim() ||
    input.registration.guestEmail?.trim() ||
    null;
  if (!email) return null;

  const match = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  return match?.id ?? null;
}

async function resolveBuyerSenderUserId(input: {
  currentUserId: string | null;
  buyerEmail: string;
}): Promise<{ senderUserId: string; type: "GENERAL" | "SYSTEM" } | null> {
  if (input.currentUserId) {
    return { senderUserId: input.currentUserId, type: "GENERAL" };
  }

  const buyerMatch = await prisma.user.findFirst({
    where: {
      email: { equals: input.buyerEmail.trim(), mode: "insensitive" },
    },
    select: { id: true },
  });
  if (buyerMatch) {
    return { senderUserId: buyerMatch.id, type: "GENERAL" };
  }

  const adminIds = await getSiteAdminUserIds();
  if (adminIds.length === 0) return null;

  return { senderUserId: adminIds[0]!, type: "SYSTEM" };
}

/** In-app message to the vehicle listing owner after a buyer inquiry. */
export async function sendVehicleSaleInquiryInAppMessage(input: {
  inquiryId: string;
  sellerUserId: string | null;
  eventId: string;
  orgId: string | null;
  eventShowNumber: number;
  eventName: string;
  vehicleLabel: string;
  vehicleEntryCode: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  smsNotificationsOptIn: boolean;
  offerAmountCents: number | null;
  message: string | null;
  currentUserId: string | null;
  registration: {
    userId: string | null;
    user: { id: string } | null;
    guestEmail: string | null;
    registrantEmail: string | null;
  };
}): Promise<{ sent: boolean }> {
  const recipientUserId = await resolveSellerRecipientUserId({
    sellerUserId: input.sellerUserId,
    registration: input.registration,
  });
  if (!recipientUserId) return { sent: false };

  const sender = await resolveBuyerSenderUserId({
    currentUserId: input.currentUserId,
    buyerEmail: input.buyerEmail,
  });
  if (!sender) return { sent: false };

  const inquiryDetailUrl = input.sellerUserId
    ? `${getSiteOrigin()}${sellerDashboardInquiryUrl(input.inquiryId)}`
    : null;

  const subject = buildVehicleSaleInquiryMessageSubject({
    vehicleEntryCode: input.vehicleEntryCode,
    eventShowNumber: input.eventShowNumber,
    eventName: input.eventName,
  });
  const body = buildVehicleSaleInquiryMessageBody({
    eventShowNumber: input.eventShowNumber,
    eventName: input.eventName,
    vehicleLabel: input.vehicleLabel,
    vehicleEntryCode: input.vehicleEntryCode,
    buyerName: input.buyerName,
    buyerEmail: input.buyerEmail,
    buyerPhone: input.buyerPhone,
    smsNotificationsOptIn: input.smsNotificationsOptIn,
    offerAmountCents: input.offerAmountCents,
    message: input.message,
    inquiryDetailUrl,
  });

  await prisma.message.create({
    data: {
      type: sender.type,
      subject,
      body,
      senderUserId: sender.senderUserId,
      recipientUserId,
      eventId: input.eventId,
      orgId: input.orgId,
    },
  });

  return { sent: true };
}
