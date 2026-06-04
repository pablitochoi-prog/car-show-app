import { NextResponse } from "next/server";
import { getCurrentUser, requireOrgOwner } from "@/lib/auth";
import { resolveStripeAppOrigin, syncAccountStatus } from "@/lib/stripe-connect";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stripe return_url — sync status then redirect to the app UI (fast redirect). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");
  const returnTo = searchParams.get("returnTo");
  const origin = resolveStripeAppOrigin(new URL(request.url).origin);

  if (!orgId) {
    return NextResponse.redirect(`${origin}/dashboard/clubs`);
  }

  const safeReturnTo =
    returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : null;

  const user = await getCurrentUser();
  if (!user) {
    const login = new URL("/login", origin);
    login.searchParams.set(
      "redirect",
      `/api/stripe/connect/return?${searchParams.toString()}`,
    );
    return NextResponse.redirect(login);
  }

  try {
    await requireOrgOwner(user.id, orgId);
  } catch {
    return NextResponse.redirect(`${origin}/dashboard/clubs`);
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { stripeAccountId: true },
  });

  if (!org?.stripeAccountId) {
    return NextResponse.redirect(`${origin}/dashboard/clubs`);
  }

  let stripeResult: "active" | "pending" | "incomplete" | "error" = "error";
  try {
    const { sync } = await syncAccountStatus(org.stripeAccountId);
    if (sync.stripeChargesEnabled && sync.stripeDetailsSubmitted) {
      stripeResult = "active";
    } else if (sync.pendingReview) {
      stripeResult = "pending";
    } else {
      stripeResult = "incomplete";
    }
  } catch (err) {
    console.error("[GET /api/stripe/connect/return] sync failed", err);
  }

  const destPath = safeReturnTo ?? "/dashboard/stripe/return";
  const dest = new URL(destPath, origin);
  if (!safeReturnTo) {
    dest.searchParams.set("orgId", orgId);
  } else if (safeReturnTo.includes("/edit")) {
    dest.searchParams.set("orgId", orgId);
  }
  dest.searchParams.set("stripe", stripeResult);
  if (safeReturnTo?.includes("/edit") && stripeResult !== "active") {
    dest.hash = "payment-settings";
  }

  return NextResponse.redirect(dest);
}
