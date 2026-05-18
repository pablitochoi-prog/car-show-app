"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AdminDeleteUserDialog } from "./admin-delete-user-dialog";

type UserDetail = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  platformRole: string;
  status: string;
  statusReason: string | null;
  statusChangedAt: string | null;
  createdAt: string;
  _count: {
    vehicles: number;
    registrations: number;
    sentMessages: number;
    receivedMessages: number;
  };
  registrations: {
    id: string;
    status: string;
    paymentStatus: string | null;
    createdAt: string;
    event: { id: string; name: string; showNumber: number };
    tier: { name: string };
  }[];
};

type MessageRow = {
  id: string;
  type: string;
  subject: string;
  body: string;
  createdAt: string;
  sender: { name: string; email: string };
  recipient: { name: string; email: string } | null;
  event: { name: string; showNumber: number } | null;
};

function statusVariant(
  status: string,
): "success" | "warning" | "danger" | "muted" {
  if (status === "ACTIVE") return "success";
  if (status === "SUSPENDED") return "warning";
  if (status === "BANNED") return "danger";
  return "muted";
}

type Props = {
  userId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
};

export function AdminUserDetailDrawer({
  userId,
  open,
  onClose,
  onUpdated,
}: Props) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusReason, setStatusReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!open || !userId) {
      setUser(null);
      setMessages([]);
      return;
    }

    setLoading(true);
    void fetch(`/api/admin/accounts/${userId}`, { credentials: "same-origin" })
      .then(async (res) => {
        const data = (await res.json()) as {
          user?: UserDetail;
          messages?: MessageRow[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Failed to load");
        setUser(data.user ?? null);
        setMessages(data.messages ?? []);
        setStatusReason(data.user?.statusReason ?? "");
      })
      .catch(() => {
        setUser(null);
        setMessages([]);
      })
      .finally(() => setLoading(false));
  }, [open, userId]);

  async function setStatus(status: string) {
    if (!userId) return;
    setSaving(true);
    const res = await fetch("/api/admin/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        id: userId,
        status,
        statusReason: statusReason.trim() || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      onUpdated();
      onClose();
    }
  }

  const label = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email
    : "";

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>User profile</SheetTitle>
          </SheetHeader>

          {loading && (
            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </p>
          )}

          {user && !loading && (
            <div className="mt-4 space-y-6 pb-8">
              <div>
                <p className="text-lg font-semibold">{label}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {user.phone && (
                  <p className="text-sm text-muted-foreground">{user.phone}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant={statusVariant(user.status)}>{user.status}</Badge>
                  <Badge variant="outline">{user.platformRole}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Registrations: </span>
                  {user._count.registrations}
                </p>
                <p>
                  <span className="text-muted-foreground">Vehicles: </span>
                  {user._count.vehicles}
                </p>
                <p>
                  <span className="text-muted-foreground">Messages sent: </span>
                  {user._count.sentMessages}
                </p>
                <p>
                  <span className="text-muted-foreground">Received: </span>
                  {user._count.receivedMessages}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-reason">Status note (optional)</Label>
                <textarea
                  id="status-reason"
                  rows={2}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Reason for suspend or ban…"
                />
                <div className="flex flex-wrap gap-2">
                  {user.status !== "ACTIVE" && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving}
                      onClick={() => void setStatus("ACTIVE")}
                    >
                      Reactivate
                    </Button>
                  )}
                  {user.status !== "SUSPENDED" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() => void setStatus("SUSPENDED")}
                    >
                      Suspend
                    </Button>
                  )}
                  {user.status !== "BANNED" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={saving}
                      onClick={() => void setStatus("BANNED")}
                    >
                      Ban
                    </Button>
                  )}
                </div>
              </div>

              {user.registrations.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium">Recent registrations</h3>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {user.registrations.map((r) => (
                      <li key={r.id}>
                        {r.event.name} — {r.tier.name} ({r.status})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium">Recent messages</h3>
                {messages.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">No messages.</p>
                ) : (
                  <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-sm">
                    {messages.map((m) => (
                      <li key={m.id} className="rounded-md border p-2">
                        <p className="font-medium">{m.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.type} · {new Date(m.createdAt).toLocaleString()}
                        </p>
                        <p className="mt-1 line-clamp-2 text-muted-foreground">
                          {m.body}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={() => setDeleteOpen(true)}
              >
                Permanently delete user…
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {userId && (
        <AdminDeleteUserDialog
          userId={userId}
          userLabel={label}
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => {
            onUpdated();
            onClose();
          }}
        />
      )}
    </>
  );
}
