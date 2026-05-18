"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";

export function ComposeMessageDialog({
  open,
  onOpenChange,
  title,
  eventId,
  eventLabel,
  recipientUserId,
  recipientUserIds,
  recipientHint,
  initialSubject,
  initialBody,
  onSent,
  notifySiteAdmins,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  eventId?: string;
  eventLabel?: string;
  recipientUserId?: string;
  /** Send one copy per recipient (organizer → registrants). */
  recipientUserIds?: string[];
  recipientHint?: string;
  initialSubject?: string;
  initialBody?: string;
  onSent?: () => void;
  /** Fan-out to all site administrators (requires eventId). */
  notifySiteAdmins?: boolean;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSubject(
      initialSubject ?? (eventLabel ? `Question about ${eventLabel}` : ""),
    );
    setBody(initialBody ?? "");
    setError("");
    setSending(false);
  }, [open, eventLabel, initialSubject, initialBody]);

  async function handleSend() {
    if (!subject.trim() || !body.trim()) {
      setError("Subject and message are required.");
      return;
    }

    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          messageBody: body.trim(),
          eventId: eventId ?? undefined,
          recipientUserId: recipientUserId ?? undefined,
          recipientUserIds:
            recipientUserIds && recipientUserIds.length > 0
              ? recipientUserIds
              : undefined,
          notifySiteAdmins: notifySiteAdmins ?? undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to send message.");
        return;
      }

      onSent?.();
      onOpenChange(false);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative mx-4 w-full max-w-lg rounded-xl border bg-background p-6 shadow-lg">
        <button
          type="button"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:text-foreground"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-4" />
        </button>

        <h2 className="text-lg font-semibold">
          {title ??
            (eventLabel ? `Message about ${eventLabel}` : "New Message")}
        </h2>
        {recipientHint ? (
          <p className="mt-1 text-xs text-muted-foreground">{recipientHint}</p>
        ) : eventLabel && !recipientUserId ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Your message will be sent to all event organizers for this show.
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="msg-subject">Subject</Label>
            <Input
              id="msg-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="msg-body">Message</Label>
            <textarea
              id="msg-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Type your message…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={sending || !subject.trim() || !body.trim()}
              onClick={() => void handleSend()}
              className="gap-1"
            >
              {sending && <Loader2 className="size-3 animate-spin" />}
              Send Message
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
