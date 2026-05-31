"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  redirectTo: string;
  initialEmailSent: boolean;
  initialMaskedEmail: string;
  initialResendAvailableAt: string | null;
  initialSendError: string | null;
};

type StatusResponse = {
  verified?: boolean;
  resendAvailableAt?: string | null;
  emailSent?: boolean;
  error?: string;
};

export function OrganizerVerifyOtpForm({
  redirectTo,
  initialEmailSent,
  initialMaskedEmail,
  initialResendAvailableAt,
  initialSendError,
}: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(initialSendError ?? "");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(initialEmailSent);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(
    initialMaskedEmail || null,
  );
  const [resendAt, setResendAt] = useState<number | null>(
    initialResendAvailableAt
      ? new Date(initialResendAvailableAt).getTime()
      : null,
  );
  const [cooldownSec, setCooldownSec] = useState(0);

  const refreshStatus = useCallback(async () => {
    const res = await fetch("/api/organizer/otp/status", {
      credentials: "same-origin",
    });
    const data = (await res.json()) as StatusResponse;
    if (!res.ok) {
      setError(data.error ?? "Could not load verification status.");
      return false;
    }
    if (data.verified) {
      return true;
    }
    setEmailSent(Boolean(data.emailSent));
    if (data.resendAvailableAt) {
      setResendAt(new Date(data.resendAvailableAt).getTime());
    } else {
      setResendAt(null);
    }
    return false;
  }, []);

  useEffect(() => {
    if (!resendAt) {
      setCooldownSec(0);
      return;
    }
    const tick = () => {
      const remaining = Math.ceil((resendAt - Date.now()) / 1000);
      setCooldownSec(Math.max(0, remaining));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [resendAt]);

  async function sendCode() {
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/organizer/otp/send", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        error?: string;
        resendAvailableAt?: string | null;
      };
      if (!res.ok) {
        if (res.status === 429 && data.resendAvailableAt) {
          await refreshStatus();
          return;
        }
        setError(data.error ?? "Could not send verification code.");
        if (data.resendAvailableAt) {
          setResendAt(new Date(data.resendAvailableAt).getTime());
        }
        return;
      }
      setEmailSent(true);
      await refreshStatus();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/organizer/otp/verify", {
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

      const verified = await refreshStatus();
      if (verified) {
        window.location.replace(redirectTo);
        return;
      }

      window.location.replace(redirectTo);
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
        <p className="font-medium">Organizer verification</p>
      </div>
      <p className="text-sm text-muted-foreground">
        For your attendees&apos; privacy, please verify your account before
        accessing event management information.
      </p>

      {emailSent && maskedEmail ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="size-4 shrink-0" aria-hidden />
          Code sent to {maskedEmail}
        </p>
      ) : sending ? (
        <p className="text-sm text-muted-foreground">Sending verification code…</p>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="otp-code">6-digit code</Label>
        <Input
          id="otp-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          disabled={loading}
          autoFocus
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full gap-2"
        disabled={loading || code.length !== 6}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        Verify and continue
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={sending || cooldownSec > 0}
        onClick={() => void sendCode()}
      >
        {sending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : cooldownSec > 0 ? (
          `Resend code in ${cooldownSec}s`
        ) : (
          "Resend code"
        )}
      </Button>
    </form>
  );
}
