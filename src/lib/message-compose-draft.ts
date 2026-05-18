import type { MessageRow } from "@/components/messages/message-list";

export type ComposeDraft = {
  subject: string;
  body: string;
  eventId?: string;
  eventLabel?: string;
  recipientUserId?: string;
  title: string;
  recipientHint?: string;
};

function replySubject(subject: string) {
  return /^re:\s/i.test(subject) ? subject : `Re: ${subject}`;
}

function quotedOriginal(
  msg: MessageRow,
  fromName: string,
  heading = "Original message",
) {
  const eventLine = msg.event ? `\nEvent: ${msg.event.name}` : "";
  return `\n\n---------- ${heading} ----------\nFrom: ${fromName}\nDate: ${new Date(msg.createdAt).toLocaleString()}${eventLine}\nSubject: ${msg.subject}\n\n${msg.body}`;
}

function otherPartyName(msg: MessageRow, currentUserId: string) {
  const isSent = msg.sender?.id === currentUserId;
  return isSent
    ? (msg.recipient?.name ?? "Event Organizer")
    : (msg.sender?.name ?? "System");
}

function primaryReplyUserId(msg: MessageRow, currentUserId: string) {
  const isSent = msg.sender?.id === currentUserId;
  return isSent ? msg.recipient?.id : msg.sender?.id;
}

export function buildForwardDraft(
  msg: MessageRow,
  currentUserId: string,
): ComposeDraft {
  const fromName = otherPartyName(msg, currentUserId);
  return {
    title: "Forward message",
    subject: msg.subject.startsWith("Fwd:") ? msg.subject : `Fwd: ${msg.subject}`,
    body: quotedOriginal(msg, fromName, "Forwarded message"),
    eventId: msg.event?.id,
    eventLabel: msg.event?.name,
  };
}

export function buildReplyDraft(
  msg: MessageRow,
  currentUserId: string,
): ComposeDraft {
  const fromName = otherPartyName(msg, currentUserId);
  const recipientUserId = primaryReplyUserId(msg, currentUserId);

  return {
    title: "Reply",
    subject: replySubject(msg.subject),
    body: quotedOriginal(msg, fromName),
    eventId: msg.event?.id,
    eventLabel: msg.event?.name,
    recipientUserId: recipientUserId ?? undefined,
    recipientHint: recipientUserId
      ? `To: ${fromName}`
      : msg.event
        ? "Your reply will go to the event organizers."
        : undefined,
  };
}

export function buildReplyAllDraft(
  msg: MessageRow,
  currentUserId: string,
): ComposeDraft {
  const fromName = otherPartyName(msg, currentUserId);

  if (msg.event?.id) {
    return {
      title: "Reply all",
      subject: replySubject(msg.subject),
      body: quotedOriginal(msg, fromName),
      eventId: msg.event.id,
      eventLabel: msg.event.name,
      recipientHint: "All event organizers for this show will receive your reply.",
    };
  }

  const recipientUserId = primaryReplyUserId(msg, currentUserId);
  return {
    title: "Reply all",
    subject: replySubject(msg.subject),
    body: quotedOriginal(msg, fromName),
    recipientUserId: recipientUserId ?? undefined,
    recipientHint: recipientUserId ? `To: ${fromName}` : undefined,
  };
}
