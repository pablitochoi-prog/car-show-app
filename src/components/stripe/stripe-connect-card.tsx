"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Unlink,
} from "lucide-react";

export type StripeConnectInfo = {
  orgId: string;
  orgName: string;
  stripeAccountId: string | null;
  stripeAccountStatus: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
};

export function StripeConnectCard({
  info,
  canDisconnect = true,
  returnPath,
}: {
  info: StripeConnectInfo;
  /** When false, hide disconnect (e.g. non–org owners). */
  canDisconnect?: boolean;
  /** Path to return to after Stripe onboarding (e.g. event edit page). */
  returnPath?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConnected = info.stripeAccountId !== null;
  const isActive =
    info.stripeAccountStatus === "ACTIVE" && info.chargesEnabled;
  const pendingReview =
    isConnected &&
    info.detailsSubmitted &&
    !info.chargesEnabled &&
    info.stripeAccountStatus !== "RESTRICTED" &&
    info.stripeAccountStatus !== "DISABLED";
  const isOnboarding =
    info.stripeAccountStatus === "ONBOARDING" && !pendingReview;
  const needsAction =
    info.stripeAccountStatus === "RESTRICTED" ||
    info.stripeAccountStatus === "DISABLED";

  const stripeBody = () => ({
    orgId: info.orgId,
    origin: typeof window !== "undefined" ? window.location.origin : undefined,
    ...(returnPath ? { returnPath } : {}),
  });

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/connect/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stripeBody()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to connect");
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  async function handleFinishSetup() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/connect/create-account-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stripeBody()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create link");
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    const confirmed = window.confirm(
      "Disconnect Stripe from this club?\n\n" +
        "• Registration payments will stop for all events using this organization\n" +
        "• Paid registration will be turned off on those events\n" +
        "• Your Stripe account is not deleted—you can connect again later\n\n" +
        "Continue?",
    );
    if (!confirmed) return;

    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/connect/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: info.orgId }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to disconnect");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setDisconnecting(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/connect/refresh-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: info.orgId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to refresh");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setRefreshing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Stripe Payments
          {isActive && (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
              Connected
            </Badge>
          )}
          {pendingReview && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Pending Review
            </Badge>
          )}
          {isOnboarding && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
              Setup Incomplete
            </Badge>
          )}
          {needsAction && (
            <Badge variant="danger">Action Required</Badge>
          )}
        </CardTitle>
        <CardDescription>
          {!isConnected
            ? "Connect Stripe to accept registration payments directly to your club."
            : isActive
              ? `Payments go directly to ${info.orgName}'s Stripe account.`
              : pendingReview
                ? "Stripe is reviewing your submitted information. Refresh status in a few minutes, then enable paid registration below."
                : "Complete your Stripe setup to start accepting payments."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected && (
          <p className="rounded-md border border-muted bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            After Stripe shows{" "}
            <span className="font-medium text-foreground">
              Information submitted
            </span>
            , click{" "}
            <span className="font-medium text-foreground">
              Return to CarShowScout
            </span>{" "}
            on that screen so we can sync your account.
          </p>
        )}

        {pendingReview && (
          <div className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-950 dark:text-blue-100">
            Your details were submitted to Stripe. Charges are not enabled yet—this
            is normal while Stripe reviews the account (often just a few minutes in
            test mode). Click <span className="font-medium">Refresh Status</span>{" "}
            below, then turn on paid registration for this event.
          </div>
        )}

        {isActive && (
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Charges: </span>
              <span className="font-medium">
                {info.chargesEnabled ? (
                  <span className="text-emerald-600">Enabled</span>
                ) : (
                  <span className="text-red-600">Disabled</span>
                )}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Payouts: </span>
              <span className="font-medium">
                {info.payoutsEnabled ? (
                  <span className="text-emerald-600">Enabled</span>
                ) : (
                  <span className="text-red-600">Disabled</span>
                )}
              </span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {!isConnected && (
            <Button onClick={handleConnect} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 size-4" />
              )}
              Connect Stripe
            </Button>
          )}

          {isConnected && !isActive && !pendingReview && (
            <Button onClick={handleFinishSetup} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <AlertTriangle className="mr-2 size-4" />
              )}
              Finish Stripe Setup
            </Button>
          )}

          {isActive && (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="size-4" />
              Ready to accept payments
            </div>
          )}

          {isConnected && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing || disconnecting}
              >
                {refreshing ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 size-4" />
                )}
                Refresh Status
              </Button>
              {canDisconnect && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => void handleDisconnect()}
                  disabled={disconnecting || refreshing}
                >
                  {disconnecting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Unlink className="mr-2 size-4" />
                  )}
                  Disconnect Stripe
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
