"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ComposeMessageDialog } from "@/components/messages/compose-message-dialog";
import { MessageSquare } from "lucide-react";

export function ContactSiteAdminButton({
  eventId,
  eventLabel,
  className,
}: {
  eventId: string;
  eventLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="mr-2 size-4" />
        Message Site Admin
      </Button>
      <ComposeMessageDialog
        open={open}
        onOpenChange={setOpen}
        title="Message Site Admin"
        eventId={eventId}
        eventLabel={eventLabel}
        notifySiteAdmins
        recipientHint="Your message is sent to all site administrators for this event."
        initialSubject={`Event support: ${eventLabel}`}
        initialBody={`Regarding event ${eventLabel}:\n\n`}
      />
    </>
  );
}
