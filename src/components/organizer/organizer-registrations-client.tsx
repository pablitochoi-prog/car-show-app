"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/components/registration/reg-utils";
import type { RegistrationFeeType } from "@prisma/client";
import type { PlatformFeeConfig } from "@/lib/platform-fee-config";
import {
  buildOrganizerRegistrationRows,
  type OrganizerRegistrationInput,
  type OrganizerRegistrationRow,
} from "@/lib/organizer-registration-rows";
import {
  type RegistrationColumnKey,
  useRegistrationsColumnLayout,
} from "@/components/organizer/use-registrations-column-layout";
import { CustomRefundDialog } from "@/components/organizer/custom-refund-dialog";
import { RemoveRegistrationsDialog } from "@/components/organizer/remove-registrations-dialog";
import { ComposeMessageDialog } from "@/components/messages/compose-message-dialog";
import { CreateDashCardsLink } from "@/components/organizer/create-dash-cards-link";
import {
  applyColumnFilters,
  RegistrationsColumnFilter,
  RegistrationsFilterSummary,
  useColumnFilterOptions,
  type ColumnFilterValue,
} from "@/components/organizer/registrations-column-filter";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  ChevronDown,
  ExternalLink,
  Loader2,
  MessageSquare,
  Trash2,
} from "lucide-react";

type SortKey = RegistrationColumnKey | "email";
type SortDir = "asc" | "desc";

type BulkAction =
  | "cancel"
  | "delete"
  | "refund_full"
  | "refund_75"
  | "refund_50"
  | "refund_25"
  | "refund_custom";

function statusBadgeClass(variant: OrganizerRegistrationRow["displayStatus"]["variant"]) {
  switch (variant) {
    case "success":
      return "border-emerald-500/40 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100";
    case "warning":
      return "border-amber-500/40 bg-yellow-100 text-yellow-950 dark:bg-yellow-950/40 dark:text-yellow-100";
    case "danger":
      return "border-pink-500/40 bg-pink-100 text-pink-950 dark:bg-pink-950/40 dark:text-pink-100";
    default:
      return "border-muted bg-muted/60 text-muted-foreground";
  }
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

function sortRows(
  rows: OrganizerRegistrationRow[],
  key: SortKey,
  dir: SortDir,
): OrganizerRegistrationRow[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "status":
        cmp = a.displayStatus.label.localeCompare(b.displayStatus.label);
        break;
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "email":
        cmp = a.email.localeCompare(b.email);
        break;
      case "tier":
        cmp = a.tierName.localeCompare(b.tierName);
        break;
      case "cars":
        cmp = a.vehicleCount - b.vehicleCount;
        break;
      case "fee":
        cmp = a.clubFeeCents - b.clubFeeCents;
        break;
      case "collected":
        cmp = a.clubCollectedCents - b.clubCollectedCents;
        break;
      case "due":
        cmp = a.clubDueCents - b.clubDueCents;
        break;
      default:
        cmp = 0;
    }
    return cmp * mul;
  });
}

function computeSubtotals(rows: OrganizerRegistrationRow[]) {
  const active = rows.filter((r) => r.status !== "CANCELLED");
  return {
    registrants: active.length,
    cars: active.reduce((s, r) => s + (r.vehicleCount ?? 0), 0),
    clubFees: active.reduce(
      (s, r) => s + (Number(r.clubFeeCents) || 0),
      0,
    ),
    clubCollected: active.reduce(
      (s, r) => s + (Number(r.clubCollectedCents) || 0),
      0,
    ),
    clubDue: active.reduce((s, r) => s + (Number(r.clubDueCents) || 0), 0),
  };
}

export function OrganizerRegistrationsClient({
  eventId,
  eventLabel,
  registrationInputs,
  registrationFeeType,
  suggestedDonationDollars,
  platformFee,
  isDonationEvent = false,
  dashCardsAllowed = true,
  dashCardsBlockedMessage,
}: {
  eventId: string;
  eventLabel: string;
  registrationInputs: OrganizerRegistrationInput[];
  registrationFeeType: RegistrationFeeType;
  suggestedDonationDollars: number | null;
  platformFee: PlatformFeeConfig;
  isDonationEvent?: boolean;
  dashCardsAllowed?: boolean;
  dashCardsBlockedMessage?: string;
}) {
  const router = useRouter();
  const rows = useMemo(
    () =>
      buildOrganizerRegistrationRows(
        registrationInputs,
        {
          registrationFeeType,
          suggestedDonationPerVehicleDollars: suggestedDonationDollars,
        },
        platformFee,
      ),
    [
      registrationInputs,
      registrationFeeType,
      suggestedDonationDollars,
      platformFee,
    ],
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [customRefundOpen, setCustomRefundOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [statusFilter, setStatusFilter] = useState<ColumnFilterValue>(null);
  const [tierFilter, setTierFilter] = useState<ColumnFilterValue>(null);
  const { widths, onResizeStart } = useRegistrationsColumnLayout();

  const statusOptions = useColumnFilterOptions(
    rows,
    (r) => r.displayStatus.label,
  );
  const tierOptions = useColumnFilterOptions(rows, (r) => r.tierName);

  const filteredRows = useMemo(
    () =>
      applyColumnFilters(rows, [
        {
          getValue: (r) => r.displayStatus.label,
          selected: statusFilter,
        },
        { getValue: (r) => r.tierName, selected: tierFilter },
      ]),
    [rows, statusFilter, tierFilter],
  );

  const hasActiveFilters =
    (statusFilter !== null && statusFilter.size < statusOptions.length) ||
    (tierFilter !== null && tierFilter.size < tierOptions.length);

  const sorted = useMemo(
    () => sortRows(filteredRows, sortKey, sortDir),
    [filteredRows, sortKey, sortDir],
  );

  const subtotals = useMemo(() => computeSubtotals(filteredRows), [filteredRows]);

  const feeColumnLabel = isDonationEvent ? "Donation" : "Reg. fee";
  const feeSubtotalLabel = isDonationEvent ? "Total donations" : "Total reg. fees";

  const allSelected =
    sorted.length > 0 && sorted.every((r) => selected.has(r.id));
  const someSelected = selected.size > 0;

  const selectedRows = useMemo(
    () => sorted.filter((r) => selected.has(r.id)),
    [sorted, selected],
  );

  const messageRecipientIds = useMemo(
    () =>
      [
        ...new Set(
          selectedRows
            .map((r) => r.userId)
            .filter((id): id is string => typeof id === "string" && id.length > 0),
        ),
      ],
    [selectedRows],
  );

  const messageRecipientHint = useMemo(() => {
    if (messageRecipientIds.length === 0) {
      return "Selected guest registrations do not have user accounts for in-app messages.";
    }
    const names = selectedRows
      .filter((r) => r.userId)
      .map((r) => r.name);
    if (names.length === 1) {
      return `To: ${names[0]}`;
    }
    return `To: ${names.length} registrants (${names.join(", ")})`;
  }, [messageRecipientIds.length, selectedRows]);

  const singleSelectedRow =
    selectedRows.length === 1 ? selectedRows[0] : null;
  const canOpenRegistrationPage = Boolean(singleSelectedRow?.userId);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

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
    setSelected(new Set(sorted.map((r) => r.id)));
  }

  async function runBulk(
    action: BulkAction,
    customAmountCents?: number,
  ): Promise<boolean> {
    const ids = [...selected];
    if (ids.length === 0) return false;

    setBusy(true);
    setActionError("");
    try {
      const res = await fetch(`/api/events/${eventId}/registrations/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids,
          action,
          ...(action === "refund_custom"
            ? { customAmountCents }
            : {}),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        results?: { id: string; ok: boolean; error?: string }[];
      };

      if (!res.ok) {
        setActionError(data.error ?? data.message ?? "Action failed.");
        return false;
      }

      const failed = (data.results ?? []).filter((r) => !r.ok);
      if (!data.ok) {
        const detail = failed[0]?.error;
        setActionError(
          detail
            ? `${data.message ?? "Action failed."} ${detail}`
            : (data.message ?? "Action failed."),
        );
        return false;
      }

      setSelected(new Set());
      router.refresh();
      return true;
    } catch {
      setActionError("Something went wrong. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function headerCell(
    label: string,
    column: RegistrationColumnKey,
    sortableKey: SortKey,
    filter?: {
      options: string[];
      value: ColumnFilterValue;
      onChange: (next: ColumnFilterValue) => void;
    },
  ) {
    return (
      <th
        className="relative border-r p-0 text-left last:border-r-0"
        style={{ width: widths[column] }}
      >
        <div className="flex items-center pr-1">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1 px-3 py-2.5 text-xs font-medium hover:bg-muted/50"
            onClick={() => toggleSort(sortableKey)}
          >
            <span className="truncate">{label}</span>
            <SortIcon active={sortKey === sortableKey} dir={sortDir} />
          </button>
          {filter ? (
            <RegistrationsColumnFilter
              label={label}
              options={filter.options}
              value={filter.value}
              onChange={filter.onChange}
            />
          ) : null}
        </div>
        <ColumnResizeHandle
          onResizeStart={(x) => onResizeStart(column, x)}
        />
      </th>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground sm:text-left">
        No registrations yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {actionError ? (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      <CustomRefundDialog
        open={customRefundOpen}
        onOpenChange={setCustomRefundOpen}
        selectedCount={selected.size}
        onConfirm={async (amountCents) => {
          await runBulk("refund_custom", amountCents);
        }}
      />

      <RemoveRegistrationsDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        selectedCount={selected.size}
        onConfirm={() => runBulk("delete")}
      />

      <ComposeMessageDialog
        open={messageOpen}
        onOpenChange={setMessageOpen}
        title="Message registrant"
        eventId={eventId}
        eventLabel={eventLabel}
        recipientUserIds={messageRecipientIds}
        recipientHint={messageRecipientHint}
        onSent={() => {
          setSelected(new Set());
          router.refresh();
        }}
      />

      <RegistrationsFilterSummary
        visibleCount={filteredRows.length}
        totalCount={rows.length}
        hasActiveFilters={hasActiveFilters}
        onClear={() => {
          setStatusFilter(null);
          setTierFilter(null);
        }}
      />

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 px-2 py-1.5">
          <input
            type="checkbox"
            className="size-4 shrink-0 rounded border-input"
            checked={allSelected}
            onChange={toggleAll}
            aria-label="Select all registrations"
          />
          {someSelected ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2"
                disabled={busy}
                onClick={() => void runBulk("cancel")}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Ban className="size-4" />
                )}
                <span className="hidden sm:inline">Cancel registration</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-destructive hover:text-destructive"
                disabled={busy}
                onClick={() => setRemoveDialogOpen(true)}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                <span className="hidden sm:inline">Remove from event</span>
              </Button>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger
                  disabled={busy}
                  className={cn(
                    "inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium hover:bg-muted",
                    busy && "pointer-events-none opacity-50",
                  )}
                >
                  Refund
                  <ChevronDown className="size-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() => void runBulk("refund_full")}
                  >
                    Refund 100%
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => void runBulk("refund_75")}
                  >
                    Refund 75%
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => void runBulk("refund_50")}
                  >
                    Refund 50%
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => void runBulk("refund_25")}
                  >
                    Refund 25%
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setCustomRefundOpen(true)}
                  >
                    Refund custom amount…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2"
                disabled={busy || messageRecipientIds.length === 0}
                title={
                  messageRecipientIds.length === 0
                    ? "Guest registrations cannot receive in-app messages"
                    : undefined
                }
                onClick={() => setMessageOpen(true)}
              >
                <MessageSquare className="size-4" />
                <span className="hidden sm:inline">Send message</span>
              </Button>
              <CreateDashCardsLink
                eventId={eventId}
                registrationIds={[...selected]}
                disabled={!dashCardsAllowed}
                disabledTitle={dashCardsBlockedMessage}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2"
                disabled={busy || !canOpenRegistrationPage}
                title={
                  selected.size !== 1
                    ? "Select exactly one registration"
                    : !canOpenRegistrationPage
                      ? "Guest registrations do not have an editable registration page"
                      : "Open registration page"
                }
                onClick={() => {
                  if (!singleSelectedRow?.userId) return;
                  router.push(
                    `/organizer/events/${eventId}/registrations/${singleSelectedRow.id}`,
                  );
                }}
              >
                <ExternalLink className="size-4" />
                <span className="hidden sm:inline">Open registration page</span>
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">
                {selected.size} selected
              </span>
            </>
          ) : (
            <span className="px-2 text-xs text-muted-foreground">
              Select rows for bulk actions
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table
            className="w-full text-sm"
            style={{ tableLayout: "fixed", minWidth: 860 }}
          >
            <colgroup>
              <col style={{ width: 40 }} />
              {(Object.keys(widths) as RegistrationColumnKey[]).map((k) => (
                <col key={k} style={{ width: widths[k] }} />
              ))}
            </colgroup>
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="w-10 p-0" />
                {headerCell("Status", "status", "status", {
                  options: statusOptions,
                  value: statusFilter,
                  onChange: setStatusFilter,
                })}
                {headerCell("Name", "name", "name")}
                {headerCell("Tier", "tier", "tier", {
                  options: tierOptions,
                  value: tierFilter,
                  onChange: setTierFilter,
                })}
                {headerCell("# Cars", "cars", "cars")}
                {headerCell(feeColumnLabel, "fee", "fee")}
                {headerCell("Amount collected", "collected", "collected")}
                {headerCell("Amount due", "due", "due")}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-sm text-muted-foreground"
                  >
                    No registrations match the current filters.
                  </td>
                </tr>
              ) : null}
              {sorted.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-t transition-colors hover:bg-muted/30",
                    selected.has(row.id) && "bg-primary/5",
                  )}
                >
                  <td className="p-2 align-middle">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input"
                      checked={selected.has(row.id)}
                      onChange={() => toggleOne(row.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${row.name}`}
                    />
                  </td>
                  <td className="truncate px-3 py-2 align-middle">
                    <Link
                      href={`/organizer/events/${eventId}/registrations/${row.id}`}
                      className="block min-w-0"
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          "max-w-full truncate font-normal",
                          statusBadgeClass(row.displayStatus.variant),
                        )}
                      >
                        {row.displayStatus.label}
                      </Badge>
                      {row.isGuest ? (
                        <span className="mt-1 block text-[10px] text-amber-700 dark:text-amber-300">
                          Guest
                        </span>
                      ) : null}
                    </Link>
                  </td>
                  <td className="truncate px-3 py-2 align-middle">
                    <Link
                      href={`/organizer/events/${eventId}/registrations/${row.id}`}
                      className="font-medium hover:underline"
                    >
                      {row.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.email}
                    </p>
                  </td>
                  <td className="truncate px-3 py-2 align-middle">
                    <Link
                      href={`/organizer/events/${eventId}/registrations/${row.id}`}
                      className="block truncate hover:underline"
                    >
                      {row.tierName}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-center align-middle tabular-nums">
                    <Link
                      href={`/organizer/events/${eventId}/registrations/${row.id}`}
                      className="block hover:underline"
                    >
                      {row.vehicleCount}
                    </Link>
                  </td>
                  <td className="px-3 py-2 align-middle text-xs sm:text-sm">
                    <Link
                      href={`/organizer/events/${eventId}/registrations/${row.id}`}
                      className="block hover:underline tabular-nums"
                    >
                      {row.regFeeDisplay}
                    </Link>
                  </td>
                  <td className="px-3 py-2 align-middle text-xs sm:text-sm">
                    <Link
                      href={`/organizer/events/${eventId}/registrations/${row.id}`}
                      className="block hover:underline tabular-nums"
                    >
                      {row.amountCollectedDisplay}
                    </Link>
                  </td>
                  <td className="px-3 py-2 align-middle text-xs sm:text-sm">
                    <Link
                      href={`/organizer/events/${eventId}/registrations/${row.id}`}
                      className="block hover:underline tabular-nums"
                    >
                      {row.amountDueDisplay}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 bg-muted/40">
              <tr className="font-medium">
                <td className="p-2" />
                <td className="px-3 py-2.5 text-xs" colSpan={2}>
                  Subtotals
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                  {subtotals.registrants} registrant
                  {subtotals.registrants === 1 ? "" : "s"}
                </td>
                <td className="px-3 py-2.5 text-center text-xs tabular-nums">
                  {subtotals.cars}
                </td>
                <td className="px-3 py-2.5 text-xs tabular-nums">
                  {formatMoney(subtotals.clubFees)}
                </td>
                <td className="px-3 py-2.5 text-xs tabular-nums">
                  {formatMoney(subtotals.clubCollected)}
                </td>
                <td className="px-3 py-2.5 text-xs tabular-nums">
                  {formatMoney(subtotals.clubDue)}
                </td>
              </tr>
              <tr>
                <td className="p-1" />
                <td
                  className="px-3 pb-2 text-[11px] text-muted-foreground"
                  colSpan={7}
                >
                  {feeSubtotalLabel}, amount collected, and amount due exclude
                  platform convenience fees (club revenue).
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
