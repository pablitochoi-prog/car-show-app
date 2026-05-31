"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  redirectTo?: string;
  title?: string;
  description?: string;
};

export function MfaChallengeForm({
  redirectTo = "/dashboard",
  title = "Authenticator verification",
  description = "Enter the 6-digit code from your authenticator app.",
}: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Verification failed.");
        return;
      }

      const safeRedirect =
        redirectTo.startsWith("/") && !redirectTo.startsWith("//")
          ? redirectTo
          : "/dashboard";
      window.location.assign(safeRedirect);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <ShieldCheck className="size-5" aria-hidden />
        <p className="font-medium">{title}</p>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>

      <div className="space-y-1.5">
        <Label htmlFor="mfa-code">6-digit code</Label>
        <Input
          id="mfa-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          disabled={loading}
          autoFocus
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full gap-2" disabled={loading || code.length !== 6}>
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ShieldOff className="size-4" />
        )}
        Verify and continue
      </Button>
    </form>
  );
}
