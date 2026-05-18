"use client";

import { useSearchParams } from "next/navigation";

export function StripeReturnBanner() {
  const params = useSearchParams();
  const stripe = params.get("stripe");
  if (!stripe) return null;

  if (stripe === "active") {
    return (
      <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-950 dark:text-emerald-100">
        Stripe is connected. Turn on{" "}
        <span className="font-medium">Enable paid registration</span> below and
        save.
      </div>
    );
  }

  if (stripe === "pending") {
    return (
      <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm text-blue-950 dark:text-blue-100">
        Stripe received your information and is reviewing your account. Click{" "}
        <span className="font-medium">Refresh Status</span> in Payment Settings
        in a few minutes, then enable paid registration.
      </div>
    );
  }

  if (stripe === "incomplete" || stripe === "error") {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
        Stripe setup is not complete yet. Use{" "}
        <span className="font-medium">Finish Stripe Setup</span> below to continue.
      </div>
    );
  }

  return null;
}
