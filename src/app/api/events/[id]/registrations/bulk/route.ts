import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, writeAccessDeniedResponse } from "@/lib/auth";
import { canManageEventRegistrations } from "@/lib/organizer-registrations-auth";
import { stripe } from "@/lib/stripe";
import { sendRefundProcessedMessage } from "@/lib/refund-processed-message";
import { sendRegistrationCancelledMessage } from "@/lib/registration-cancelled-message";

type RouteParams = { params: Promise<{ id: string }> };

type BulkAction =
  | "cancel"
  | "delete"
  | "refund_full"
  | "refund_75"
  | "refund_50"
  | "refund_25"
  | "refund_custom";

/** Registrations safe to remove from the event list (cancelled or unpaid abandoned). */
function canDeleteRegistration(reg: {
  status: string;
  paymentStatus: string | null;
}): boolean {
  if (reg.status === "CANCELLED") return true;
  if (reg.status === "PENDING" && reg.paymentStatus !== "PAID") return true;
  return false;
}

const REFUND_PERCENT: Record<
  Exclude<BulkAction, "cancel" | "delete" | "refund_custom">,
  number
> = {
  refund_full: 100,
  refund_75: 75,
  refund_50: 50,
  refund_25: 25,
};

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const writeDenied = writeAccessDeniedResponse(user);
  if (writeDenied) return writeDenied;

  const { id: eventId } = await params;

  const allowed = await canManageEventRegistrations(
    user.id,
    eventId,
    user.platformRole,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { ids, action, customAmountCents } = body as {
    ids?: string[];
    action?: BulkAction;
    customAmountCents?: number;
  };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: "Select at least one registration." },
      { status: 400 },
    );
  }

  if (!action) {
    return NextResponse.json({ error: "Missing action." }, { status: 400 });
  }

  const validActions: BulkAction[] = [
    "cancel",
    "delete",
    "refund_full",
    "refund_75",
    "refund_50",
    "refund_25",
    "refund_custom",
  ];
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  if (
    action === "refund_custom" &&
    (typeof customAmountCents !== "number" ||
      !Number.isInteger(customAmountCents) ||
      customAmountCents <= 0)
  ) {
    return NextResponse.json(
      { error: "Custom refund amount must be a positive integer (cents)." },
      { status: 400 },
    );
  }

  const registrations = await prisma.registration.findMany({
    where: { eventId, id: { in: ids } },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      amountCents: true,
      refundedCents: true,
      stripePaymentIntentId: true,
    },
  });

  const results: {
    id: string;
    ok: boolean;
    error?: string;
  }[] = [];

  for (const id of ids) {
    const reg = registrations.find((r) => r.id === id);
    if (!reg) {
      results.push({ id, ok: false, error: "Registration not found." });
      continue;
    }

    try {
      if (action === "cancel") {
        if (reg.status === "CANCELLED") {
          results.push({ id, ok: true });
          continue;
        }
        await prisma.registration.update({
          where: { id: reg.id },
          data: {
            status: "CANCELLED",
            paymentStatus:
              reg.paymentStatus === "PAID" ? reg.paymentStatus : "CANCELED",
          },
        });

        try {
          await sendRegistrationCancelledMessage({
            registrationId: reg.id,
            senderUserId: user.id,
          });
        } catch (msgErr) {
          console.error("[registrations/bulk] cancel message", id, msgErr);
        }

        results.push({ id, ok: true });
        continue;
      }

      if (action === "delete") {
        if (!canDeleteRegistration(reg)) {
          results.push({
            id,
            ok: false,
            error:
              "Only cancelled or unpaid pending registrations can be removed. Cancel active registrations first.",
          });
          continue;
        }
        await prisma.registration.delete({ where: { id: reg.id } });
        results.push({ id, ok: true });
        continue;
      }

      if (reg.paymentStatus !== "PAID" || !reg.stripePaymentIntentId) {
        results.push({
          id,
          ok: false,
          error: "No paid Stripe payment to refund.",
        });
        continue;
      }

      const paidCents = reg.amountCents ?? 0;
      if (paidCents <= 0) {
        results.push({ id, ok: false, error: "Paid amount unknown." });
        continue;
      }

      let refundCents: number;
      if (action === "refund_custom") {
        refundCents = customAmountCents!;
      } else {
        const pct = REFUND_PERCENT[action];
        refundCents = Math.round((paidCents * pct) / 100);
      }

      if (refundCents > paidCents) {
        results.push({
          id,
          ok: false,
          error: "Refund amount exceeds amount paid.",
        });
        continue;
      }

      await stripe.refunds.create({
        payment_intent: reg.stripePaymentIntentId,
        amount: refundCents,
      });

      const fullRefund = refundCents >= paidCents;
      await prisma.registration.update({
        where: { id: reg.id },
        data: {
          refundedCents: reg.refundedCents + refundCents,
          paymentStatus: fullRefund ? "REFUNDED" : reg.paymentStatus,
          status: fullRefund ? "CANCELLED" : reg.status,
        },
      });

      try {
        await sendRefundProcessedMessage({
          registrationId: reg.id,
          refundCents,
          senderUserId: user.id,
        });
      } catch (msgErr) {
        console.error("[registrations/bulk] refund message", id, msgErr);
      }

      results.push({ id, ok: true });
    } catch (err) {
      console.error("[registrations/bulk]", id, err);
      results.push({
        id,
        ok: false,
        error:
          action === "delete"
            ? "Could not remove this registration."
            : "Action failed. Check Stripe configuration.",
      });
    }
  }

  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({
    results,
    ok: failed.length === 0,
    message:
      failed.length === 0
        ? "Completed."
        : `${failed.length} of ${results.length} could not be completed.`,
  });
}
