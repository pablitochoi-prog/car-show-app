"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { PlatformStripeStatus } from "@/lib/stripe-platform";

export function AdminPlatformStripe() {
  const [status, setStatus] = useState<PlatformStripeStatus | null>(null);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stripe-platform", {
        credentials: "same-origin",
      });
      if (res.ok) {
        const data = (await res.json()) as {
          status: PlatformStripeStatus;
          ready: boolean;
          convenienceFeeNote: string;
        };
        setStatus(data.status);
        setReady(data.ready);
        setNote(data.convenienceFeeNote);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Checking platform Stripe connection...
      </div>
    );
  }

  if (!status) {
    return (
      <p className="text-sm text-red-600">Unable to load platform Stripe status.</p>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <div
        className={`flex items-start gap-2 rounded-lg border px-4 py-3 ${
          ready
            ? "border-emerald-500/40 bg-emerald-500/10"
            : "border-amber-500/40 bg-amber-500/10"
        }`}
      >
        {ready ? (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
        ) : (
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
        )}
        <div>
          <p className="font-medium">
            {ready
              ? "CarShowScout.com Stripe account is ready"
              : "CarShowScout.com Stripe account is not ready"}
          </p>
          {status.accountId ? (
            <p className="mt-1 text-muted-foreground">
              Account: {status.accountId}
              {status.businessName ? ` (${status.businessName})` : ""}
            </p>
          ) : null}
          {status.error ? (
            <p className="mt-1 text-red-600">{status.error}</p>
          ) : null}
        </div>
      </div>

      <ul className="list-inside list-disc space-y-1 text-muted-foreground">
        <li>
          Convenience fees: collected via Stripe Connect{" "}
          <code className="text-xs">application_fee_amount</code> on registrant
          checkouts.
        </li>
        <li>
          Flat platform fees: paid directly to CarShowScout.com via platform Checkout
          when an organizer chooses flat billing.
        </li>
      </ul>

      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}

      <p className="text-xs text-muted-foreground">
        Configure <code className="text-xs">STRIPE_SECRET_KEY</code> and{" "}
        <code className="text-xs">STRIPE_WEBHOOK_SECRET</code> in the deployment
        environment. Clubs connect their own Stripe accounts separately under
        each event&apos;s Payment Settings.
      </p>
    </div>
  );
}
