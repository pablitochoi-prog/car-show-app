import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { isTrustedAppHost } from "@/lib/safe-redirect-origin";
import {
  buildStripeConnectSyncResult,
  type StripeConnectSyncResult,
} from "@/lib/stripe-connect-sync";

export type { StripeConnectSyncResult } from "@/lib/stripe-connect-sync";
export { buildStripeConnectSyncResult } from "@/lib/stripe-connect-sync";

const defaultAppUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );

/** Use the browser origin in dev when ports differ from NEXT_PUBLIC_APP_URL. */
export function resolveStripeAppOrigin(requestOrigin?: string | null): string {
  const fallback = defaultAppUrl();
  if (!requestOrigin?.trim()) return fallback;

  try {
    const parsed = new URL(requestOrigin.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return fallback;
    }

    // Only honor the request origin when its host is on the trusted allowlist.
    // Rejects look-alikes (e.g. evilcarshowscout.com) and arbitrary *.vercel.app.
    if (isTrustedAppHost(parsed.host)) {
      return `${parsed.protocol}//${parsed.host}`;
    }
  } catch {
    /* use fallback */
  }

  return fallback;
}

/**
 * Create a Stripe Express connected account for an organization.
 * Returns the existing account ID if one is already linked.
 */
export async function createConnectedAccount(
  orgId: string,
  orgName: string,
  email: string
) {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { stripeAccountId: true },
  });

  if (org.stripeAccountId) return org.stripeAccountId;

  const account = await stripe.accounts.create({
    type: "express",
    country: "US",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: { name: orgName },
    metadata: { orgId },
  });

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      stripeAccountId: account.id,
      stripeAccountStatus: "ONBOARDING",
      stripeConnectedAt: new Date(),
    },
  });

  return account.id;
}

/**
 * Create a Stripe Account Link for onboarding or updating account info.
 */
export async function createAccountLink(
  stripeAccountId: string,
  orgId: string,
  options?: { returnPath?: string; origin?: string | null },
) {
  const base = resolveStripeAppOrigin(options?.origin);
  const account = await stripe.accounts.retrieve(stripeAccountId);
  const currentlyDue = account.requirements?.currently_due ?? [];
  const pastDue = account.requirements?.past_due ?? [];
  const disabledReason = account.requirements?.disabled_reason ?? null;
  const returnQuery = new URLSearchParams({ orgId });
  if (options?.returnPath) {
    returnQuery.set("returnTo", options.returnPath);
  }

  const refreshQuery = new URLSearchParams({ orgId });
  if (options?.returnPath) {
    refreshQuery.set("returnTo", options.returnPath);
  }

  // Use onboarding when anything is outstanding (including past_due / disabled).
  const needsOnboardingFlow =
    !account.details_submitted ||
    currentlyDue.length > 0 ||
    pastDue.length > 0 ||
    disabledReason === "requirements.past_due" ||
    (disabledReason != null &&
      !disabledReason.startsWith("rejected.") &&
      disabledReason !== "requirements.pending_verification" &&
      disabledReason !== "under_review");

  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${base}/api/stripe/connect/create-account-link?${refreshQuery.toString()}`,
    return_url: `${base}/api/stripe/connect/return?${returnQuery.toString()}`,
    type: needsOnboardingFlow ? "account_onboarding" : "account_update",
    ...(needsOnboardingFlow
      ? {
          collection_options: {
            fields:
              currentlyDue.length > 0 || pastDue.length > 0
                ? "currently_due"
                : "eventually_due",
          },
        }
      : {}),
  });

  return link.url;
}

/** Retrieve the latest account status from Stripe and sync to our DB. */
export async function syncAccountStatus(stripeAccountId: string) {
  const account = await stripe.accounts.retrieve(stripeAccountId);
  const sync = buildStripeConnectSyncResult(account);

  const isNewlyComplete =
    sync.stripeAccountStatus === "ACTIVE" &&
    sync.stripeChargesEnabled &&
    sync.stripeDetailsSubmitted;

  const org = await prisma.organization.update({
    where: { stripeAccountId: account.id },
    data: {
      stripeAccountStatus: sync.stripeAccountStatus,
      stripeChargesEnabled: sync.stripeChargesEnabled,
      stripePayoutsEnabled: sync.stripePayoutsEnabled,
      stripeDetailsSubmitted: sync.stripeDetailsSubmitted,
      stripeLastSyncedAt: new Date(),
      ...(isNewlyComplete ? { onboardingCompletedAt: new Date() } : {}),
    },
  });

  return { org, sync };
}

/**
 * Remove the organization's link to Stripe in CarShowApp.
 * Does not delete the Stripe Express account on Stripe's side.
 * Disables online payments on all events for this organization.
 */
export async function disconnectOrganizationStripe(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { stripeAccountId: true },
  });

  if (!org?.stripeAccountId) {
    return { disconnected: false as const };
  }

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: orgId },
      data: {
        stripeAccountId: null,
        stripeAccountStatus: "NOT_CONNECTED",
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeDetailsSubmitted: false,
        onboardingCompletedAt: null,
        stripeConnectedAt: null,
        stripeLastSyncedAt: null,
      },
    }),
    prisma.event.updateMany({
      where: { orgId, paymentEnabled: true },
      data: { paymentEnabled: false },
    }),
  ]);

  return { disconnected: true as const };
}
