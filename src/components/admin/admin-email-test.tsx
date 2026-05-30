"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

type AdminEmailTestProps = {
  defaultRecipientEmail: string;
};

type EmailSendResult =
  | { sent: true; messageId?: string }
  | { sent: false; skipped: true; reason: string }
  | { sent: false; skipped: false; error: string };

type TestEmailResponse = {
  to?: string;
  result?: EmailSendResult;
  error?: string;
};

function formatResultMessage(data: TestEmailResponse): {
  type: "success" | "error";
  text: string;
} {
  if (data.error) {
    return { type: "error", text: data.error };
  }

  const result = data.result;
  if (!result) {
    return { type: "error", text: "Unexpected response from server." };
  }

  if (result.sent) {
    const id = result.messageId ? ` Message ID: ${result.messageId}` : "";
    return {
      type: "success",
      text: `Test email sent to ${data.to ?? "recipient"}.${id}`,
    };
  }

  if (result.skipped) {
    return { type: "error", text: result.reason };
  }

  return { type: "error", text: result.error };
}

export function AdminEmailTest({ defaultRecipientEmail }: AdminEmailTestProps) {
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipientEmail);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [lastResponse, setLastResponse] = useState<TestEmailResponse | null>(
    null,
  );

  async function handleSend() {
    setSending(true);
    setMessage(null);
    setLastResponse(null);

    try {
      const trimmed = recipientEmail.trim();
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(trimmed ? { to: trimmed } : {}),
      });

      const data = (await res.json()) as TestEmailResponse;
      setLastResponse(data);

      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error ?? "Request failed.",
        });
      } else {
        setMessage(formatResultMessage(data));
      }
    } catch (err) {
      const text =
        err instanceof Error ? err.message : "Failed to send test email.";
      setMessage({ type: "error", text });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Send a temporary SendGrid test message. Leave the recipient blank to use
        your admin account email.
      </p>

      <div className="max-w-md space-y-2">
        <Label htmlFor="admin-test-email-recipient">Test recipient email</Label>
        <Input
          id="admin-test-email-recipient"
          type="email"
          autoComplete="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          placeholder={defaultRecipientEmail || "you@example.com"}
          disabled={sending}
        />
      </div>

      <Button type="button" onClick={() => void handleSend()} disabled={sending}>
        {sending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Sending…
          </>
        ) : (
          "Send Test Email"
        )}
      </Button>

      {message ? (
        <p
          className={
            message.type === "success"
              ? "text-sm text-green-700 dark:text-green-400"
              : "text-sm text-destructive"
          }
          role="status"
        >
          {message.text}
        </p>
      ) : null}

      {lastResponse ? (
        <pre className="max-w-full overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
          {JSON.stringify(lastResponse, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
