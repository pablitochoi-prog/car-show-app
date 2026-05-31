"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MfaStatus = {
  isAdmin: boolean;
  mfaEnrolled: boolean;
  mfaVerifiedForSession: boolean;
};

export function AdminMfaSetup() {
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/me/mfa/status", { credentials: "same-origin" });
      const data = (await res.json()) as MfaStatus & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load MFA status");
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function startEnroll() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/me/mfa/enroll", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        factorId?: string;
        qrCodeDataUrl?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Could not start setup");
      setFactorId(data.factorId ?? null);
      setQrCodeDataUrl(data.qrCodeDataUrl ?? null);
      setCode("");
      setMessage("Scan the QR code, then enter the 6-digit code to activate.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start setup.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelEnroll() {
    setBusy(true);
    setError("");
    try {
      await fetch("/api/me/mfa/cancel-enroll", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(factorId ? { factorId } : {}),
      });
    } catch {
      // Best-effort cleanup; reset UI either way.
    } finally {
      setFactorId(null);
      setQrCodeDataUrl(null);
      setCode("");
      setBusy(false);
    }
  }

  async function verifyEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/me/mfa/verify-enroll", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factorId, code: code.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Verification failed");
      setFactorId(null);
      setQrCodeDataUrl(null);
      setCode("");
      setMessage("Authenticator app enabled.");
      await loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function disableMfa(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/me/mfa/disable", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not disable MFA");
      setDisableCode("");
      setMessage("Authenticator app disabled.");
      await loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not disable MFA.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading security settings…
      </p>
    );
  }

  if (!status?.isAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        Authenticator app MFA is currently required only for site admins.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Setup instructions</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            Install an authenticator app such as Google Authenticator, Microsoft
            Authenticator, Authy, or 1Password.
          </li>
          <li>Choose “Add account” or “Scan QR code” in the app.</li>
          <li>Scan the QR code below (shown only during setup).</li>
          <li>Enter the 6-digit code to verify and activate MFA.</li>
        </ol>
      </div>

      {message ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {status.mfaEnrolled ? (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="size-5" />
            <p className="font-medium">Authenticator app is enabled</p>
          </div>
          <p className="text-sm text-muted-foreground">
            You will be asked for a code when signing in and when accessing admin
            tools.
          </p>
          <form onSubmit={(e) => void disableMfa(e)} className="space-y-3 border-t pt-3">
            <p className="text-sm font-medium">Disable authenticator app</p>
            <p className="text-xs text-muted-foreground">
              Enter a current code to confirm before disabling.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="disable-mfa-code">6-digit code</Label>
              <Input
                id="disable-mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={disableCode}
                onChange={(e) =>
                  setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                disabled={busy}
              />
            </div>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={busy || disableCode.length !== 6}
            >
              Disable MFA
            </Button>
          </form>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border p-4">
          {!qrCodeDataUrl ? (
            <Button type="button" onClick={() => void startEnroll()} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 size-4" />
              )}
              Enable Authenticator App
            </Button>
          ) : (
            <form onSubmit={(e) => void verifyEnroll(e)} className="space-y-4">
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-medium">Scan this QR code</p>
                <div className="rounded-lg border bg-white p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeDataUrl}
                    alt="Authenticator QR code"
                    width={200}
                    height={200}
                    className="size-[200px]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="enroll-mfa-code">Enter 6-digit code</Label>
                <Input
                  id="enroll-mfa-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  disabled={busy}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy || code.length !== 6}>
                  {busy ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Verify and activate MFA
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void cancelEnroll()}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {!status.mfaEnrolled ? (
        <p className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
          <ShieldOff className="mt-0.5 size-4 shrink-0" />
          Admin MFA is not enabled. Please enable it to protect site admin access.
        </p>
      ) : null}
    </div>
  );
}
