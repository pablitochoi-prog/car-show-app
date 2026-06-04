"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminDeleteSaleInquiriesDialog } from "@/components/admin/admin-delete-sale-inquiries-dialog";
import { formatUsdWholeDollars } from "@/lib/money";
import {
  saleInquiryStatusLabel,
  saleInquiryStatusVariant,
} from "@/lib/sale-inquiry-status";
import type { SellerInquiryListItem } from "@/lib/vehicle-sale-inquiries-for-seller";

export type AdminSaleInquiryListItem = SellerInquiryListItem & {
  submittedAtLabel: string;
};

export function AdminSaleInquiriesList({
  inquiries,
}: {
  inquiries: AdminSaleInquiryListItem[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allIds = useMemo(() => inquiries.map((inquiry) => inquiry.id), [inquiries]);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(allIds) : new Set());
  }

  async function deleteSelected(): Promise<boolean> {
    const ids = [...selected];
    if (ids.length === 0) return false;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sale-inquiries/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not delete selected inquiries.");
        return false;
      }
      setSelected(new Set());
      router.refresh();
      return true;
    } catch {
      setError("Could not delete selected inquiries.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (inquiries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        No vehicle sale inquiries have been submitted yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <AdminDeleteSaleInquiriesDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        selectedCount={selected.size}
        onConfirm={deleteSelected}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/20 px-4 py-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border-input"
            checked={allSelected}
            onChange={(e) => toggleAll(e.target.checked)}
            aria-label="Select all sale inquiries"
          />
          <span className="text-muted-foreground">
            {someSelected
              ? `${selected.size} selected`
              : "Select inquiries"}
          </span>
        </label>
        {someSelected ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-8 gap-1"
            disabled={busy}
            onClick={() => setDeleteOpen(true)}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Delete selected
          </Button>
        ) : null}
        {busy ? (
          <Loader2 className="ml-auto size-4 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="divide-y rounded-lg border">
        {inquiries.map((inquiry) => {
          const isSelected = selected.has(inquiry.id);
          return (
            <li key={inquiry.id} className="flex gap-3 px-4 py-4">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 rounded border-input"
                checked={isSelected}
                onChange={(e) => toggleOne(inquiry.id, e.target.checked)}
                aria-label={`Select inquiry from ${inquiry.buyerName}`}
              />
              <Link
                href={`/admin/sale-inquiries/${inquiry.id}`}
                className="flex min-w-0 flex-1 flex-col gap-2 transition-colors hover:text-foreground lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {inquiry.buyerName}
                    </p>
                    <Badge variant={saleInquiryStatusVariant(inquiry.status)}>
                      {saleInquiryStatusLabel(inquiry.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {inquiry.buyerEmail}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {inquiry.vehicleLabel}
                    {inquiry.vehicleEntryCode
                      ? ` · ${inquiry.vehicleEntryCode}`
                      : ""}{" "}
                    · {inquiry.eventLabel}
                  </p>
                </div>
                <div className="shrink-0 text-left text-sm lg:text-right">
                  <p className="text-muted-foreground">
                    {inquiry.submittedAtLabel}
                  </p>
                  {inquiry.offerAmountCents != null ? (
                    <p className="font-medium text-foreground">
                      Offer{" "}
                      {formatUsdWholeDollars(inquiry.offerAmountCents / 100)}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
