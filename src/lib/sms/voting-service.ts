import type { SmsProvider as PrismaSmsProvider } from "@prisma/client";
import { prisma } from "@/lib/db";
import { findVehicleEntryByCode } from "@/lib/vehicle-entry-lookup";
import { hashPhoneNumber } from "@/lib/sms/hash-phone";
import { parseInboundSmsBody } from "@/lib/sms/normalize-vote-code";
import type { InboundSmsMessage, SmsVotingResult } from "@/lib/sms/types";
import {
  isCategoryVotingOpen,
  isSmsVotingOpenForEvent,
} from "@/lib/sms/voting-window";

const SESSION_TTL_MS = 10 * 60 * 1000;

const MSG_INVALID =
  "We could not understand your vote. Please text the vehicle code shown on the dash card, such as AXY-004.";
const MSG_VOTING_CLOSED = "SMS voting is not open for this event.";
const MSG_NO_CATEGORIES =
  "SMS voting is not configured for this event yet. Please contact the event organizer.";
const MSG_SMS_UNAVAILABLE =
  "SMS voting is temporarily unavailable. Please try again later or contact the event organizer.";

function prismaProvider(provider: InboundSmsMessage["provider"]): PrismaSmsProvider {
  return provider === "telnyx" ? "TELNYX" : "TWILIO";
}

function formatCategoryOptions(
  categories: { smsOptionNumber: number; name: string }[],
): string {
  return categories
    .sort((a, b) => a.smsOptionNumber - b.smsOptionNumber)
    .map((c) => `Reply ${c.smsOptionNumber} for ${c.name}.`)
    .join("\n");
}

async function loadActiveCategories(eventId: string, now: Date) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      smsVotingEnabled: true,
      smsVotingStartsAt: true,
      smsVotingEndsAt: true,
      status: true,
    },
  });
  if (!event) return { event: null, categories: [], eventOpen: false };

  const eventOpen = isSmsVotingOpenForEvent(event, now);
  const rows = await prisma.votingCategory.findMany({
    where: { eventId, isActive: true },
    orderBy: { smsOptionNumber: "asc" },
  });
  const categories = rows.filter((c) =>
    isCategoryVotingOpen(c, eventOpen, now),
  );
  return { event, categories, eventOpen };
}

async function findPendingSession(fromPhoneHash: string, now: Date) {
  return prisma.smsVoteSession.findFirst({
    where: {
      fromPhoneHash,
      status: "PENDING_CATEGORY",
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function expireStaleSessions(fromPhoneHash: string, now: Date) {
  await prisma.smsVoteSession.updateMany({
    where: {
      fromPhoneHash,
      status: "PENDING_CATEGORY",
      expiresAt: { lte: now },
    },
    data: { status: "EXPIRED" },
  });
}

async function recordVote(params: {
  eventId: string;
  votingCategoryId: string;
  vehicleEntryCode: string;
  registrationId: string | null;
  registrationVehicleId: string | null;
  fromPhoneHash: string;
  provider: PrismaSmsProvider;
  providerMessageId: string;
  rawBody: string;
  normalizedVoteCode: string | null;
}): Promise<{ ok: true } | { ok: false; duplicate: true; categoryName: string }> {
  const category = await prisma.votingCategory.findUnique({
    where: { id: params.votingCategoryId },
    select: { name: true },
  });
  const categoryName = category?.name ?? "award";

  try {
    await prisma.smsVote.create({
      data: {
        eventId: params.eventId,
        votingCategoryId: params.votingCategoryId,
        vehicleEntryCode: params.vehicleEntryCode,
        registrationId: params.registrationId,
        registrationVehicleId: params.registrationVehicleId,
        fromPhoneHash: params.fromPhoneHash,
        provider: params.provider,
        providerMessageId: params.providerMessageId,
        rawBody: params.rawBody,
        normalizedVoteCode: params.normalizedVoteCode,
      },
    });
    return { ok: true };
  } catch (e) {
    const isDuplicate =
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "P2002";
    if (isDuplicate) {
      return { ok: false, duplicate: true, categoryName };
    }
    throw e;
  }
}

async function handleVehicleCode(
  message: InboundSmsMessage,
  code: string,
  fromPhoneHash: string,
  now: Date,
): Promise<SmsVotingResult> {
  const entry = await findVehicleEntryByCode(code);
  if (!entry) {
    return { responseText: MSG_INVALID };
  }

  const { categories, eventOpen } = await loadActiveCategories(
    entry.eventId,
    now,
  );
  if (!eventOpen) {
    return { responseText: MSG_VOTING_CLOSED };
  }
  if (categories.length === 0) {
    return { responseText: MSG_NO_CATEGORIES };
  }

  const provider = prismaProvider(message.provider);

  if (categories.length === 1) {
    const cat = categories[0]!;
    const result = await recordVote({
      eventId: entry.eventId,
      votingCategoryId: cat.id,
      vehicleEntryCode: entry.vehicleEntryCode,
      registrationId: entry.registrationId,
      registrationVehicleId: entry.registrationVehicleId,
      fromPhoneHash,
      provider,
      providerMessageId: message.providerMessageId,
      rawBody: message.body,
      normalizedVoteCode: code,
    });
    if (!result.ok) {
      return {
        responseText: `We already received your ${result.categoryName} vote for this event.`,
      };
    }
    return {
      responseText: `Thank you for voting for ${entry.vehicleEntryCode}.`,
    };
  }

  await prisma.smsVoteSession.updateMany({
    where: {
      fromPhoneHash,
      status: "PENDING_CATEGORY",
    },
    data: { status: "EXPIRED" },
  });

  await prisma.smsVoteSession.create({
    data: {
      eventId: entry.eventId,
      vehicleEntryCode: entry.vehicleEntryCode,
      registrationId: entry.registrationId,
      registrationVehicleId: entry.registrationVehicleId,
      fromPhoneHash,
      provider,
      providerMessageId: message.providerMessageId,
      status: "PENDING_CATEGORY",
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    },
  });

  return {
    responseText: `Your vote has been received for ${entry.vehicleEntryCode}.\n\n${formatCategoryOptions(categories)}`,
  };
}

async function handleCategoryNumber(
  message: InboundSmsMessage,
  optionNumber: number,
  fromPhoneHash: string,
  now: Date,
): Promise<SmsVotingResult> {
  await expireStaleSessions(fromPhoneHash, now);
  const session = await findPendingSession(fromPhoneHash, now);
  if (!session) {
    return { responseText: MSG_INVALID };
  }

  const { categories, eventOpen } = await loadActiveCategories(
    session.eventId,
    now,
  );
  if (!eventOpen) {
    return { responseText: MSG_VOTING_CLOSED };
  }

  const category = categories.find((c) => c.smsOptionNumber === optionNumber);
  if (!category) {
    return { responseText: MSG_INVALID };
  }

  const provider = prismaProvider(message.provider);
  const result = await recordVote({
    eventId: session.eventId,
    votingCategoryId: category.id,
    vehicleEntryCode: session.vehicleEntryCode,
    registrationId: session.registrationId,
    registrationVehicleId: session.registrationVehicleId,
    fromPhoneHash,
    provider,
    providerMessageId: message.providerMessageId,
    rawBody: message.body,
    normalizedVoteCode: session.vehicleEntryCode,
  });

  if (!result.ok) {
    await prisma.smsVoteSession.update({
      where: { id: session.id },
      data: { status: "COMPLETED" },
    });
    return {
      responseText: `We already received your ${result.categoryName} vote for this event.`,
    };
  }

  await prisma.smsVoteSession.update({
    where: { id: session.id },
    data: { status: "COMPLETED" },
  });

  return {
    responseText: `Thank you. Your ${category.name} vote for ${session.vehicleEntryCode} has been recorded.`,
  };
}

/** Provider-agnostic SMS voting handler. */
export async function processInboundSmsVote(
  message: InboundSmsMessage,
): Promise<SmsVotingResult> {
  const now = new Date();
  const parsed = parseInboundSmsBody(message.body);

  let fromPhoneHash: string;
  try {
    fromPhoneHash = hashPhoneNumber(message.from);
  } catch {
    console.error("[sms-voting] SMS_PHONE_HASH_SECRET not configured");
    return { responseText: MSG_SMS_UNAVAILABLE };
  }

  const existing = await prisma.smsVote.findFirst({
    where: {
      provider: prismaProvider(message.provider),
      providerMessageId: message.providerMessageId,
    },
    select: { id: true },
  });
  if (existing) {
    return { responseText: "Thank you." };
  }

  if (parsed.kind === "vehicle_code") {
    return handleVehicleCode(message, parsed.code, fromPhoneHash, now);
  }
  if (parsed.kind === "category_number") {
    return handleCategoryNumber(
      message,
      parsed.optionNumber,
      fromPhoneHash,
      now,
    );
  }

  return { responseText: MSG_INVALID };
}
