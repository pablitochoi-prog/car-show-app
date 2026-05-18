import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, writeAccessDeniedResponse } from "@/lib/auth";
import { formatEventShowNumber } from "@/lib/event-show-number";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const writeDenied = writeAccessDeniedResponse(user);
  if (writeDenied) return writeDenied;

  const { id: registrationId } = await params;

  let body: { note?: string } = {};
  try {
    body = await request.json();
  } catch {
    // no body is fine
  }

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      userId: true,
      status: true,
      paymentStatus: true,
      amountCents: true,
      eventId: true,
      event: {
        select: {
          name: true,
          showNumber: true,
          orgId: true,
          staffMembers: {
            where: {
              roleLinks: {
                some: { role: { slug: "organizer" } },
              },
            },
            select: { userId: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!registration) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  if (registration.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (registration.status === "CANCELLED") {
    return NextResponse.json(
      { error: "Registration is already cancelled" },
      { status: 400 },
    );
  }

  await prisma.registration.update({
    where: { id: registrationId },
    data: { status: "CANCELLED" },
  });

  // Send a refund-request message if registration had a payment
  const isPaid =
    registration.paymentStatus === "PAID" && (registration.amountCents ?? 0) > 0;
  const organizerUserId =
    registration.event.staffMembers[0]?.userId ?? null;
  const eventLabel = `${formatEventShowNumber(registration.event.showNumber)} ${registration.event.name}`;
  const userNote = body.note?.trim();

  const messageBody = isPaid
    ? `Refund requested for cancelled registration.\n\nEvent: ${eventLabel}\nAmount paid: $${((registration.amountCents ?? 0) / 100).toFixed(2)}${userNote ? `\n\nNote from registrant:\n${userNote}` : ""}`
    : `Registration cancelled.${userNote ? `\n\nNote from registrant:\n${userNote}` : ""}`;

  const messageSubject = isPaid
    ? `Refund request: ${eventLabel}`
    : `Cancelled registration: ${eventLabel}`;

  await prisma.message.create({
    data: {
      type: isPaid ? "REFUND_REQUEST" : "GENERAL",
      subject: messageSubject,
      body: messageBody,
      senderUserId: user.id,
      recipientUserId: organizerUserId,
      eventId: registration.eventId,
      orgId: registration.event.orgId,
    },
  });

  return NextResponse.json({ success: true });
}
