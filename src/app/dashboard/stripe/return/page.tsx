import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, requireOrgOwner } from "@/lib/auth";
import { syncAccountStatus } from "@/lib/stripe-connect";
import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";

type Props = {
  searchParams: Promise<{
    orgId?: string;
    returnTo?: string;
    stripe?: string;
  }>;
};

export default async function StripeReturnPage({ searchParams }: Props) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const orgId = sp.orgId;
  if (!orgId) redirect("/dashboard/clubs");

  const returnTo = sp.returnTo?.startsWith("/") ? sp.returnTo : null;

  try {
    await requireOrgOwner(user.id, orgId);
  } catch {
    redirect("/dashboard/clubs");
  }

  const stripeParam = sp.stripe;

  let updated = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!updated?.stripeAccountId) redirect("/dashboard/clubs");

  let sync: Awaited<ReturnType<typeof syncAccountStatus>>["sync"] | null = null;

  if (stripeParam) {
    sync = {
      stripeAccountStatus: updated.stripeAccountStatus,
      stripeChargesEnabled: updated.stripeChargesEnabled,
      stripePayoutsEnabled: updated.stripePayoutsEnabled,
      stripeDetailsSubmitted: updated.stripeDetailsSubmitted,
      pendingReview:
        updated.stripeDetailsSubmitted &&
        !updated.stripeChargesEnabled &&
        updated.stripeAccountStatus !== "RESTRICTED" &&
        updated.stripeAccountStatus !== "DISABLED",
      requirementsCurrentlyDue: [],
      requirementsPastDue: [],
    };
  } else {
    const result = await syncAccountStatus(updated.stripeAccountId);
    updated = result.org;
    sync = result.sync;
  }

  const isComplete =
    updated.stripeChargesEnabled && updated.stripeDetailsSubmitted;
  const pendingReview =
    sync?.pendingReview ?? stripeParam === "pending";
  const needsMoreInfo = (sync?.requirementsCurrentlyDue.length ?? 0) > 0;

  return (
    <div className="page-shell flex min-h-[50vh] items-start justify-center pt-12">
      <div className="mx-auto w-full max-w-lg space-y-6 text-center">
        {isComplete ? (
          <CheckCircle2 className="mx-auto size-16 text-emerald-500" />
        ) : pendingReview ? (
          <Clock className="mx-auto size-16 text-blue-500" />
        ) : (
          <AlertTriangle className="mx-auto size-16 text-amber-500" />
        )}

        <div>
          <h1 className="text-2xl font-bold">
            {isComplete
              ? "Stripe Connected!"
              : pendingReview
                ? "Information Submitted"
                : "Stripe Setup Incomplete"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isComplete
              ? `${org.name} can now accept payments. Enable paid registration on your event in Payment Settings.`
              : pendingReview
                ? "Stripe received your details and is reviewing your account. This is normal in test mode and can take a few minutes. Click Refresh Status on the event Payment Settings page, or check back shortly."
                : needsMoreInfo
                  ? "Stripe still needs additional information before payments can be enabled."
                  : "Your Stripe setup is not finished yet. Complete any remaining steps with Stripe."}
          </p>
        </div>

        <div className="mx-auto max-w-sm space-y-3 rounded-xl border bg-card p-5 text-left text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Organization
            </p>
            <p className="font-semibold">{org.name}</p>
          </div>
          <div className="border-t pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Stripe Status
            </p>
            <p className="font-medium">
              {isComplete ? (
                <span className="text-emerald-600">Active</span>
              ) : pendingReview ? (
                <span className="text-blue-600">Pending review</span>
              ) : (
                <span className="text-amber-600">
                  {updated.stripeAccountStatus.replace("_", " ")}
                </span>
              )}
            </p>
          </div>
          <div className="border-t pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Charges Enabled
            </p>
            <p className="font-medium">
              {updated.stripeChargesEnabled ? "Yes" : "No"}
            </p>
          </div>
          <div className="border-t pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Details Submitted
            </p>
            <p className="font-medium">
              {updated.stripeDetailsSubmitted ? "Yes" : "No"}
            </p>
          </div>
          {needsMoreInfo && (
            <div className="border-t pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Still required
              </p>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {sync.requirementsCurrentlyDue.slice(0, 5).map((req) => (
                  <li key={req} className="text-xs">
                    {req.replace(/_/g, " ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {pendingReview && (
          <p className="mx-auto max-w-md text-left text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Sandbox tip:</span> In
            Stripe test mode, accounts often activate within a few minutes after
            submission. Use{" "}
            <span className="font-mono">000-000</span> as the SMS verification
            code if prompted.
          </p>
        )}

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {returnTo ? (
            <Link href={returnTo} className={cn(buttonVariants(), "gap-2")}>
              Back to event
            </Link>
          ) : (
            <Link
              href="/dashboard/clubs"
              className={cn(buttonVariants(), "gap-2")}
            >
              Back to My Clubs
            </Link>
          )}
          {!isComplete && (
            <Link
              href={`/api/stripe/connect/create-account-link?orgId=${orgId}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""}`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              {needsMoreInfo ? "Complete Stripe Setup" : "Open Stripe Again"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
