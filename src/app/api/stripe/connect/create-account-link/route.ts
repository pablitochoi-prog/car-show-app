import { NextResponse } from "next/server";
import { getCurrentUser, requireOrgOwner } from "@/lib/auth";
import { createAccountLink, resolveStripeAppOrigin } from "@/lib/stripe-connect";
import { createAccountLinkSchema } from "@/lib/validation/stripe";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST: Generate an onboarding link for an org that already has a Stripe account.
 * GET:  Stripe redirects here as the refresh_url — re-creates a link and redirects.
 */
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

  const parsed = createAccountLinkSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { orgId, returnPath, origin } = parsed.data;
  const safeReturnPath =
    returnPath?.startsWith("/") && !returnPath.startsWith("//")
      ? returnPath
      : undefined;

  try {
    await requireOrgOwner(user.id, orgId);
  } catch {
    return NextResponse.json(
      { error: "Only the organization owner can manage Stripe" },
      { status: 403 },
    );
  }

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { stripeAccountId: true },
  });

  if (!org.stripeAccountId) {
    return NextResponse.json(
      { error: "No Stripe account found. Connect Stripe first." },
      { status: 400 },
    );
  }

  try {
    const url = await createAccountLink(org.stripeAccountId, orgId, {
      returnPath: safeReturnPath,
      origin,
    });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[POST /api/stripe/connect/create-account-link]", err);
    return NextResponse.json(
      { error: "Failed to create onboarding link. Please try again." },
      { status: 500 },
    );
  }
}

/** Stripe refresh_url handler — re-creates a link and redirects the user. */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const orgId = searchParams.get("orgId");
  const returnTo = searchParams.get("returnTo");
  const origin = resolveStripeAppOrigin(requestUrl.origin);
  const safeReturnPath =
    returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : undefined;

  if (!orgId) {
    return NextResponse.redirect(`${origin}/dashboard/clubs`);
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
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

  try {
    const url = await createAccountLink(org.stripeAccountId, orgId, {
      returnPath: safeReturnPath,
      origin: requestUrl.origin,
    });
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("[GET /api/stripe/connect/create-account-link]", err);
    return NextResponse.redirect(`${origin}/dashboard/clubs`);
  }
}
