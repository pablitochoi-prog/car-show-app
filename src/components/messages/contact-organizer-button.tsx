"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { ComposeMessageDialog } from "./compose-message-dialog";
import { cn } from "@/lib/utils";

export function ContactOrganizerButton({
  eventId,
  eventLabel,
  variant = "default",
  className,
}: {
  eventId: string;
  eventLabel: string;
  /** `icon` = compact control for tight headers (e.g. update registration banner). */
  variant?: "default" | "icon";
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant === "icon" ? "default" : "outline"}
        size={variant === "icon" ? "icon" : "sm"}
        className={cn(
          variant === "icon" ? "size-9 shrink-0" : "gap-1.5",
          className,
        )}
        title="Message the event organizer"
        aria-label="Send a message to the event organizer"
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="size-4" aria-hidden />
        {variant === "default" ? "Contact Organizer" : null}
      </Button>
      <ComposeMessageDialog
        open={open}
        onOpenChange={setOpen}
        eventId={eventId}
        eventLabel={eventLabel}
        onSent={() => router.refresh()}
      />
    </>
  );
}
