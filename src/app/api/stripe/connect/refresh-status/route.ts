import { NextResponse } from "next/server";
import { getCurrentUser, requireOrgOwner } from "@/lib/auth";
import { syncAccountStatus } from "@/lib/stripe-connect";
import { refreshStatusSchema } from "@/lib/validation/stripe";
import { prisma } from "@/lib/db";
import { logObservabilityError } from "@/lib/structured-logging";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = refreshStatusSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { orgId } = parsed.data;

  try {
    await requireOrgOwner(user.id, orgId);
  } catch {
    return NextResponse.json(
      { error: "Only the organization owner can refresh Stripe status" },
      { status: 403 }
    );
  }

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { stripeAccountId: true },
  });

  if (!org.stripeAccountId) {
    return NextResponse.json(
      { error: "No Stripe account connected" },
      { status: 400 }
    );
  }

  try {
    const { org: updated, sync } = await syncAccountStatus(org.stripeAccountId);
    return NextResponse.json({
      stripeAccountStatus: updated.stripeAccountStatus,
      chargesEnabled: updated.stripeChargesEnabled,
      payoutsEnabled: updated.stripePayoutsEnabled,
      detailsSubmitted: updated.stripeDetailsSubmitted,
      pendingReview: sync.pendingReview,
      requirementsCurrentlyDue: sync.requirementsCurrentlyDue,
      requirementsPastDue: sync.requirementsPastDue,
      disabledReason: sync.disabledReason,
      requirementErrors: sync.requirementErrors,
    });
  } catch (err) {
    logObservabilityError({
      source: "stripe.connect.refreshStatus",
      error: err,
      meta: { orgId },
    });
    return NextResponse.json(
      { error: "Failed to refresh status from Stripe" },
      { status: 500 }
    );
  }
}
