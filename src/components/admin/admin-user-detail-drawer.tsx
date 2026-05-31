"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UsPhoneInput } from "@/components/inputs/us-phone-input";
import { AdminDeleteUserDialog } from "./admin-delete-user-dialog";

type UserDetail = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  birthYear: number | null;
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

type EditForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  birthYear: string;
  platformRole: string;
};

const ROLE_OPTIONS = ["USER", "ORGANIZER", "ADMIN"];

function statusVariant(
  status: string,
): "success" | "warning" | "danger" | "muted" {
  if (status === "ACTIVE") return "success";
  if (status === "SUSPENDED") return "warning";
  if (status === "BANNED") return "danger";
  return "muted";
}

function formFromUser(user: UserDetail): EditForm {
  return {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email,
    phone: user.phone ?? "",
    street: user.street ?? "",
    city: user.city ?? "",
    state: user.state ?? "",
    zip: user.zip ?? "",
    birthYear: user.birthYear != null ? String(user.birthYear) : "",
    platformRole: user.platformRole,
  };
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
  const [form, setForm] = useState<EditForm | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const loadUser = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      const res = await fetch(`/api/admin/accounts/${userId}`, {
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        user?: UserDetail;
        messages?: MessageRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setUser(data.user ?? null);
      setMessages(data.messages ?? []);
      if (data.user) {
        setForm(formFromUser(data.user));
        setStatusReason(data.user.statusReason ?? "");
      }
    } catch {
      setUser(null);
      setMessages([]);
      setForm(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!open || !userId) {
      setUser(null);
      setMessages([]);
      setForm(null);
      return;
    }
    void loadUser();
  }, [open, userId, loadUser]);

  async function saveAccount() {
    if (!userId || !form || !user) return;
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    const payload: Record<string, unknown> = { id: userId };

    if (form.firstName !== (user.firstName ?? "")) payload.firstName = form.firstName;
    if (form.lastName !== (user.lastName ?? "")) payload.lastName = form.lastName;
    if (form.email.trim().toLowerCase() !== user.email) {
      payload.email = form.email.trim().toLowerCase();
    }
    if (form.phone !== (user.phone ?? "")) payload.phone = form.phone;
    if (form.street !== (user.street ?? "")) payload.street = form.street;
    if (form.city !== (user.city ?? "")) payload.city = form.city;
    if (form.state !== (user.state ?? "")) payload.state = form.state;
    if (form.zip !== (user.zip ?? "")) payload.zip = form.zip;
    const birthYearEmpty = form.birthYear.trim() === "";
    const birthYearVal = birthYearEmpty ? null : parseInt(form.birthYear, 10);
    if (birthYearEmpty && user.birthYear != null) {
      payload.birthYear = null;
    } else if (
      !birthYearEmpty &&
      Number.isFinite(birthYearVal) &&
      birthYearVal !== user.birthYear
    ) {
      payload.birthYear = birthYearVal;
    }
    if (form.platformRole !== user.platformRole) {
      payload.platformRole = form.platformRole;
    }

    if (Object.keys(payload).length === 1) {
      setSaveError("No changes to save.");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/admin/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { error?: string; account?: UserDetail };
    setSaving(false);

    if (!res.ok) {
      setSaveError(data.error ?? "Could not save changes.");
      return;
    }

    setSaveSuccess("Account updated.");
    onUpdated();
    await loadUser();
  }

  async function setStatus(status: string) {
    if (!userId) return;
    setSaving(true);
    setSaveError("");
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
    const data = (await res.json()) as { error?: string };
    setSaving(false);
    if (!res.ok) {
      setSaveError(data.error ?? "Could not update status.");
      return;
    }
    onUpdated();
    await loadUser();
  }

  const label = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email
    : "";

  function patchForm<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaveSuccess("");
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit user account</SheetTitle>
          </SheetHeader>

          {loading && (
            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </p>
          )}

          {user && form && !loading && (
            <div className="mt-4 space-y-6 pb-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant(user.status)}>{user.status}</Badge>
                <Badge variant="outline">{user.platformRole}</Badge>
                <span className="text-xs text-muted-foreground">
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm font-medium">Profile & login</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-edit-first">First name</Label>
                    <Input
                      id="admin-edit-first"
                      value={form.firstName}
                      onChange={(e) => patchForm("firstName", e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-edit-last">Last name</Label>
                    <Input
                      id="admin-edit-last"
                      value={form.lastName}
                      onChange={(e) => patchForm("lastName", e.target.value)}
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="admin-edit-email">Login email</Label>
                  <Input
                    id="admin-edit-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => patchForm("email", e.target.value)}
                    disabled={saving}
                  />
                  <p className="text-xs text-muted-foreground">
                    Updates Supabase login immediately (no confirmation email).
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="admin-edit-phone">Phone</Label>
                  <UsPhoneInput
                    id="admin-edit-phone"
                    value={form.phone}
                    onChange={(v) => patchForm("phone", v)}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="admin-edit-birth">Birth year</Label>
                  <Input
                    id="admin-edit-birth"
                    inputMode="numeric"
                    placeholder="Optional"
                    value={form.birthYear}
                    onChange={(e) => patchForm("birthYear", e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="admin-edit-role">Platform role</Label>
                  <select
                    id="admin-edit-role"
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={form.platformRole}
                    onChange={(e) => patchForm("platformRole", e.target.value)}
                    disabled={saving}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm font-medium">Mailing address</p>
                <div className="space-y-1.5">
                  <Label htmlFor="admin-edit-street">Street</Label>
                  <Input
                    id="admin-edit-street"
                    value={form.street}
                    onChange={(e) => patchForm("street", e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor="admin-edit-city">City</Label>
                    <Input
                      id="admin-edit-city"
                      value={form.city}
                      onChange={(e) => patchForm("city", e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-edit-state">State</Label>
                    <Input
                      id="admin-edit-state"
                      value={form.state}
                      onChange={(e) => patchForm("state", e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-edit-zip">ZIP</Label>
                    <Input
                      id="admin-edit-zip"
                      value={form.zip}
                      onChange={(e) => patchForm("zip", e.target.value)}
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              {saveError ? (
                <p className="text-sm text-destructive" role="alert">
                  {saveError}
                </p>
              ) : null}
              {saveSuccess ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  {saveSuccess}
                </p>
              ) : null}

              <Button
                type="button"
                className="w-full gap-2"
                disabled={saving}
                onClick={() => void saveAccount()}
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save account changes
              </Button>

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

              <div className="space-y-2 border-t pt-4">
                <Label htmlFor="status-reason">Status note (optional)</Label>
                <textarea
                  id="status-reason"
                  rows={2}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Reason for suspend or ban…"
                  disabled={saving}
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
