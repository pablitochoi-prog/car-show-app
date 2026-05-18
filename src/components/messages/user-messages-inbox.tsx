"use client";

import { Fragment, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatEventShowNumber } from "@/lib/event-show-number";
import { messageBodySnippet } from "@/lib/message-snippet";
import type { MessageRow } from "./message-list";
import {
  type MessageColumnKey,
  useMessageColumnLayout,
} from "@/components/messages/use-message-column-layout";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Forward,
  Loader2,
  Reply,
  ReplyAll,
  Mail,
  MailOpen,
  Trash2,
} from "lucide-react";

type MailboxView = "inbox" | "sent" | "archived";
type SortKey = MessageColumnKey;
type SortDir = "asc" | "desc";

function formatMessageListDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });
}

function formatMessageListTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function isReceivedBy(msg: MessageRow, currentUserId: string) {
  return msg.recipient?.id === currentUserId;
}

/** Inbox/archived received: sender. Sent tab: recipient. */
function contactLabel(
  msg: MessageRow,
  currentUserId: string,
  view: MailboxView,
) {
  const received = isReceivedBy(msg, currentUserId);
  if (view === "sent" || (view === "archived" && !received)) {
    return msg.recipient?.name ?? "Event Organizer";
  }
  return msg.sender?.name ?? "System";
}

function contactColumnHeader(view: MailboxView): string {
  if (view === "sent") return "To";
  if (view === "archived") return "Contact";
  return "From";
}

function eventLabel(msg: MessageRow) {
  if (!msg.event) return "—";
  return `${formatEventShowNumber(msg.event.showNumber)} ${msg.event.name}`;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return <ArrowUpDown className="size-3 shrink-0 opacity-40" aria-hidden />;
  }
  return dir === "asc" ? (
    <ArrowUp className="size-3 shrink-0" aria-hidden />
  ) : (
    <ArrowDown className="size-3 shrink-0" aria-hidden />
  );
}

function ColumnResizeHandle({
  onResizeStart,
}: {
  onResizeStart: (clientX: number) => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
      className="absolute top-0 right-0 z-10 h-full w-1.5 cursor-col-resize touch-none hover:bg-primary/30"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onResizeStart(e.clientX);
      }}
    />
  );
}

export function UserMessagesInbox({
  messages,
  currentUserId,
  onBulkAction,
  onMarkRead,
  onForward,
  onReply,
  onReplyAll,
  busy,
}: {
  messages: MessageRow[];
  currentUserId: string;
  busy?: boolean;
  onBulkAction: (
    ids: string[],
    action: "read" | "unread" | "delete" | "archive" | "unarchive",
  ) => Promise<void>;
  /** Marks a received message read when the user opens it. */
  onMarkRead?: (id: string) => void | Promise<void>;
  onForward: (msg: MessageRow) => void;
  onReply: (msg: MessageRow) => void;
  onReplyAll: (msg: MessageRow) => void;
}) {
  const [view, setView] = useState<MailboxView>("inbox");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const { widths, onResizeStart } = useMessageColumnLayout();

  const visible = useMemo(() => {
    return messages.filter((m) => {
      const archived = !!m.mailboxArchivedAt;
      const received = isReceivedBy(m, currentUserId);
      const sent = m.sender?.id === currentUserId;

      if (view === "archived") return archived;
      if (archived) return false;
      if (view === "inbox") return received;
      if (view === "sent") return sent;
      return true;
    });
  }, [messages, view, currentUserId]);

  const sortedVisible = useMemo(() => {
    const list = [...visible];
    const dir = sortDir === "asc" ? 1 : -1;

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "contact":
          cmp = contactLabel(a, currentUserId, view).localeCompare(
            contactLabel(b, currentUserId, view),
            undefined,
            { sensitivity: "base" },
          );
          break;
        case "subject":
          cmp = a.subject.localeCompare(b.subject, undefined, {
            sensitivity: "base",
          });
          break;
        case "event":
          cmp = eventLabel(a).localeCompare(eventLabel(b), undefined, {
            sensitivity: "base",
          });
          break;
        case "date":
          cmp =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return cmp * dir;
    });

    return list;
  }, [visible, sortKey, sortDir, currentUserId, view]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
  }

  const selectionHasInbox = useMemo(() => {
    return [...selected].some((id) => {
      const m = messages.find((x) => x.id === id);
      return m && isReceivedBy(m, currentUserId);
    });
  }, [selected, messages, currentUserId]);

  const allSelected =
    visible.length > 0 && visible.every((m) => selected.has(m.id));
  const someSelected = selected.size > 0;

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(visible.map((m) => m.id)));
  }

  async function openMessage(msg: MessageRow) {
    const isExpanded = expandedId === msg.id;
    if (isExpanded) {
      setExpandedId(null);
      return;
    }
    setExpandedId(msg.id);
    if (
      onMarkRead &&
      isReceivedBy(msg, currentUserId) &&
      !msg.readAt
    ) {
      await onMarkRead(msg.id);
    }
  }

  async function runBulk(
    action: "read" | "unread" | "delete" | "archive" | "unarchive",
  ) {
    let ids = [...selected];
    if (ids.length === 0) return;

    if (action === "read" || action === "unread") {
      ids = ids.filter((id) => {
        const m = messages.find((x) => x.id === id);
        return m && isReceivedBy(m, currentUserId);
      });
      if (ids.length === 0) return;
    }

    await onBulkAction(ids, action);
    setSelected(new Set());
    if (
      action === "delete" ||
      action === "archive" ||
      action === "unarchive"
    ) {
      setExpandedId(null);
    }
  }

  const forwardMessage =
    selected.size === 1
      ? messages.find((m) => m.id === [...selected][0])
      : null;

  if (messages.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-12 text-center">
        <Mail className="mx-auto mb-3 size-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No messages yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={view === "inbox" ? "default" : "outline"}
          onClick={() => {
            setView("inbox");
            setSelected(new Set());
          }}
        >
          Inbox
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "sent" ? "default" : "outline"}
          onClick={() => {
            setView("sent");
            setSelected(new Set());
          }}
        >
          Sent
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "archived" ? "default" : "outline"}
          onClick={() => {
            setView("archived");
            setSelected(new Set());
          }}
        >
          Archived
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 px-2 py-1.5">
          <input
            type="checkbox"
            className="size-4 shrink-0 rounded border-input"
            checked={allSelected}
            onChange={toggleAll}
            aria-label="Select all messages"
          />
          {someSelected ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2"
                disabled={busy || !selectionHasInbox}
                onClick={() => void runBulk("read")}
                title={
                  selectionHasInbox
                    ? "Mark as read"
                    : "Read/unread only applies to messages you received (Inbox)"
                }
              >
                <MailOpen className="size-4" />
                <span className="hidden sm:inline">Read</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2"
                disabled={busy || !selectionHasInbox}
                onClick={() => void runBulk("unread")}
                title={
                  selectionHasInbox
                    ? "Mark as unread"
                    : "Read/unread only applies to messages you received (Inbox)"
                }
              >
                <Mail className="size-4" />
                <span className="hidden sm:inline">Unread</span>
              </Button>
              {view === "archived" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2"
                  disabled={busy}
                  onClick={() => void runBulk("unarchive")}
                  title="Move to inbox"
                >
                  <MailOpen className="size-4" />
                  <span className="hidden sm:inline">Inbox</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2"
                  disabled={busy}
                  onClick={() => void runBulk("archive")}
                  title="Archive"
                >
                  <Archive className="size-4" />
                  <span className="hidden sm:inline">Archive</span>
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2"
                disabled={busy || !forwardMessage}
                onClick={() => forwardMessage && onForward(forwardMessage)}
                title="Forward"
              >
                <Forward className="size-4" />
                <span className="hidden sm:inline">Forward</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-destructive hover:text-destructive"
                disabled={busy}
                onClick={() => void runBulk("delete")}
                title="Delete"
              >
                <Trash2 className="size-4" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </>
          ) : (
            <span className="px-2 text-xs text-muted-foreground">
              Select messages for actions
            </span>
          )}
          {busy && <Loader2 className="ml-auto size-4 animate-spin text-muted-foreground" />}
        </div>

        {visible.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {view === "archived"
              ? "No archived messages."
              : view === "sent"
                ? "No sent messages."
                : "No messages in your inbox."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="w-full text-sm"
              style={{
                tableLayout: "fixed",
                minWidth:
                  widths.contact +
                  widths.subject +
                  widths.event +
                  widths.date +
                  40,
              }}
            >
              <colgroup>
                <col style={{ width: 40 }} />
                <col style={{ width: widths.contact }} />
                <col style={{ width: widths.subject }} />
                <col style={{ width: widths.event }} />
                <col style={{ width: widths.date }} />
              </colgroup>
              <thead className="border-b bg-muted/20 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2" aria-label="Select" />
                  {(
                    [
                      ["contact", contactColumnHeader(view)],
                      ["subject", "Subject"],
                      ["event", "Event"],
                      ["date", "Date / time"],
                    ] as const
                  ).map(([key, label]) => (
                    <th
                      key={key}
                      className={cn(
                        "relative px-2 py-2 font-medium select-none",
                        key === "date" && "text-right",
                      )}
                    >
                      <button
                        type="button"
                        className={cn(
                          "inline-flex w-full items-center gap-1 hover:text-foreground",
                          key === "date" && "justify-end",
                        )}
                        onClick={() => toggleSort(key)}
                      >
                        <span>{label}</span>
                        <SortIcon active={sortKey === key} dir={sortDir} />
                      </button>
                      <ColumnResizeHandle
                        onResizeStart={(x) => onResizeStart(key, x)}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedVisible.map((msg) => {
                  const isInbox = isReceivedBy(msg, currentUserId);
                  const isUnread = isInbox && !msg.readAt;
                  const contact = contactLabel(msg, currentUserId, view);
                  const isExpanded = expandedId === msg.id;
                  const snippet = messageBodySnippet(msg.body);

                  const rowFont = isUnread ? "font-semibold" : "font-normal";
                  const mutedCell = isUnread
                    ? "text-foreground/80"
                    : "font-normal text-muted-foreground";

                  return (
                    <Fragment key={msg.id}>
                      <tr
                        className={cn(
                          "border-b",
                          isUnread ? "bg-primary/5" : "hover:bg-muted/30",
                          selected.has(msg.id) && "bg-accent/40",
                          !isExpanded && "last:border-b-0",
                        )}
                      >
                        <td className="align-top px-2 py-2.5">
                          <input
                            type="checkbox"
                            className="size-4 rounded border-input"
                            checked={selected.has(msg.id)}
                            onChange={() => toggleOne(msg.id)}
                            aria-label={`Select message ${msg.subject}`}
                          />
                        </td>
                        <td className={cn("max-w-0 truncate px-2 py-2.5", rowFont)}>
                          <button
                            type="button"
                            className="block w-full truncate text-left"
                            onClick={() => void openMessage(msg)}
                          >
                            {contact}
                          </button>
                        </td>
                        <td className={cn("max-w-0 px-2 py-2.5", rowFont)}>
                          <button
                            type="button"
                            className="block w-full truncate text-left"
                            onClick={() => void openMessage(msg)}
                          >
                            <span>{msg.subject}</span>
                            <span className={mutedCell}> — {snippet}</span>
                            {msg.type === "REFUND_REQUEST" && (
                              <Badge variant="warning" className="ml-2 font-medium">
                                Refund
                              </Badge>
                            )}
                          </button>
                        </td>
                        <td
                          className={cn(
                            "max-w-0 truncate px-2 py-2.5",
                            rowFont,
                            mutedCell,
                          )}
                        >
                          <button
                            type="button"
                            className="block w-full truncate text-left"
                            onClick={() => void openMessage(msg)}
                          >
                            {eventLabel(msg)}
                          </button>
                        </td>
                        <td className={cn("px-2 py-2.5", rowFont, mutedCell)}>
                          <button
                            type="button"
                            className="flex w-full flex-col items-end text-right text-xs leading-tight tabular-nums"
                            onClick={() => void openMessage(msg)}
                          >
                            <span>{formatMessageListDate(msg.createdAt)}</span>
                            <span>{formatMessageListTime(msg.createdAt)}</span>
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr
                          key={`${msg.id}-body`}
                          className="border-b last:border-b-0"
                        >
                          <td colSpan={5} className="bg-muted/15 p-0">
                            <div className="border-t px-4 py-3">
                              <p className="whitespace-pre-wrap text-sm font-normal">
                                {msg.body}
                              </p>
                              {msg.organization && (
                                <p className="mt-2 text-xs font-normal text-muted-foreground">
                                  Org: {msg.organization.name}
                                </p>
                              )}
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5"
                                  onClick={() => onReply(msg)}
                                >
                                  <Reply className="size-3.5" />
                                  Reply
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5"
                                  onClick={() => onReplyAll(msg)}
                                  disabled={!msg.event?.id}
                                  title={
                                    msg.event?.id
                                      ? "Reply to all event organizers"
                                      : "Reply all is available for event messages"
                                  }
                                >
                                  <ReplyAll className="size-3.5" />
                                  Reply all
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
