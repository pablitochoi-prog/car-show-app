"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { redirectToStripeCheckout } from "@/lib/session-idle-client";
import { TierManager, type TierRow } from "@/components/forms/tier-manager";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { ImageLightbox, ThumbnailWithEye } from "@/components/ui/image-lightbox";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Copy, Loader2, Minus, Plus, Search, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { UsPhoneInput } from "@/components/inputs/us-phone-input";
import { CurrencyDollarsInput } from "@/components/inputs/currency-dollars-input";
import { splitLegacyContact } from "@/lib/contact-display";
import { authInputClass } from "@/lib/auth-ui";
import {
  addOneCalendarDay,
  type DailyHourRow,
} from "@/lib/daily-hours";
import {
  DEFAULT_EVENT_TIME_ZONE,
  EVENT_TIME_ZONE_OPTIONS,
  isEventTimeZoneIana,
  type EventTimeZoneIana,
} from "@/lib/event-time-zones";
import {
  CONTACT_EMAIL_INVALID_MESSAGE,
  isOptionalContactEmailValid,
} from "@/lib/email-contact";
import { US_STATE_CODES } from "@/lib/us-state-codes";
import {
  normalizeDatetimeLocalToFiveMinutes,
  normalizeTimeToFiveMinutes,
} from "@/lib/time-quarter-hour";
import { readResponseJson } from "@/lib/read-response-json";
import { QuarterHourTimePickers } from "@/components/inputs/quarter-hour-time-pickers";
import { formatOrgNameWithClubState } from "@/lib/format-org-display-name";
import { EventLogo } from "@/components/events/event-logo";
import {
  isYmdBeforeLocalToday,
  todayLocalYmd,
} from "@/lib/event-schedule-date";
import { timeZoneForUsState } from "@/lib/us-state-time-zone";
import { FLAT_PLATFORM_FEE_UNPAID_LISTING_MESSAGE } from "@/lib/event-platform-fee";
import { formatEventShowNumber } from "@/lib/event-show-number";

/** 12:00 AM in stored `HH:MM` form (QuarterHourTimePickers show 12-hour labels). */
const DEFAULT_SCHEDULE_TIME = normalizeTimeToFiveMinutes("00:00");

/** Default listing go-live time when none is chosen (matches time picker placeholder). */
const DEFAULT_LISTING_SCHEDULE_TIME = normalizeTimeToFiveMinutes("12:00");

export type OrgOption = {
  id: string;
  name: string;
  /** Club state postal code from organization profile, e.g. `"NJ"`. */
  clubState?: string | null;
  /** Hosting club public logo URL. */
  logo?: string | null;
};

/** Select value that triggers creating a new org on save, then linking it to the event. */
export const ADD_ORGANIZATION_SELECT_VALUE = "__ADD_ORGANIZATION__";

export type EventInitial = {
  id: string;
  orgId: string | null;
  name: string;
  estimatedCarCount?: number | null;
  description: string | null;
  venue: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  isMultiDay: boolean;
  rainDate?: string | null;
  dailyHours?: DailyHourRow[] | null;
  registrationFeeType?: "FREE" | "PAID" | "PAID_TIERED" | "DONATION" | null;
  registrationFeeDollars?: number | null;
  contactName: string | null;
  contactFirstName?: string | null;
  contactLastName?: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  eventWebsite?: string | null;
  socialHashtag: string | null;
  eventType: string;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  /** DB `Event.status` for destructive actions (edit page only). */
  persistedEventStatus?: string;
  statusReadOnly?: boolean;
  listingScheduledAt?: string | null;
  platformFeeMode?: "CONVENIENCE" | "FLAT_EVENT";
  platformSetupFeeCollected?: boolean;
  lat?: number | null;
  lng?: number | null;
  flyerUrl?: string | null;
  logoUrl?: string | null;
  /** Assigned at creation; shown on edit Event Details header. */
  showNumber?: number;
};

type ScheduleRow = {
  id: string;
  /** Canonical `YYYY-MM-DD` or empty before the user picks a date */
  date: string;
  startTime: string;
  endTime: string;
  timeZone: EventTimeZoneIana;
};

/** Fixed column widths — date | start | end | tz | +/- */
const SCHEDULE_ROW =
  "flex w-full min-w-0 flex-nowrap items-end gap-2";
const SCHEDULE_DATE_COL =
  "w-[9.5rem] max-w-[9.5rem] min-w-0 shrink-0 space-y-2";
/** 5rem + 15% ≈ 5.75rem (92px) — fits "9:30 AM" without truncating. */
const SCHEDULE_TIME_COL =
  "w-[92px] max-w-[92px] min-w-0 shrink-0 space-y-2";
const SCHEDULE_TZ_COL =
  "w-[7rem] max-w-[7rem] min-w-0 shrink-0 space-y-2";
const SCHEDULE_ACTIONS_COL =
  "flex shrink-0 items-end justify-end gap-1";

function toDateInput(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function scheduleRowsFromInitial(
  initial?: EventInitial,
  defaultTimeZone: EventTimeZoneIana = DEFAULT_EVENT_TIME_ZONE,
): ScheduleRow[] {
  const venueTimeZone = initial?.state
    ? timeZoneForUsState(initial.state)
    : defaultTimeZone;

  if (!initial) {
    return [
      {
        id: "r0",
        date: "",
        startTime: DEFAULT_SCHEDULE_TIME,
        endTime: DEFAULT_SCHEDULE_TIME,
        timeZone: defaultTimeZone,
      },
    ];
  }
  if (initial.dailyHours && initial.dailyHours.length > 0) {
    return initial.dailyHours.map((r, i) => ({
      id: `r-${i}-${r.date}`,
      date: r.date,
      startTime: normalizeTimeToFiveMinutes(r.startTime ?? ""),
      endTime: normalizeTimeToFiveMinutes(r.endTime ?? ""),
      timeZone: isEventTimeZoneIana(r.timeZone)
        ? r.timeZone
        : venueTimeZone,
    }));
  }
  return [
    {
      id: "r0",
      date: toDateInput(initial.startDate),
      startTime: normalizeTimeToFiveMinutes(initial.startTime ?? ""),
      endTime: normalizeTimeToFiveMinutes(initial.endTime ?? ""),
      timeZone: venueTimeZone,
    },
  ];
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Local datetime-local string from an ISO timestamp (browser-local offset). */
function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const raw = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return normalizeDatetimeLocalToFiveMinutes(raw);
}

function datetimeLocalToIso(local: string): string | null {
  if (!local?.trim()) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Split `YYYY-MM-DDTHH:mm` local string into date + normalized time. */
function splitLocalDatetimeString(local: string): {
  date: string;
  time: string;
} {
  if (!local.trim()) return { date: "", time: "" };
  const idx = local.indexOf("T");
  if (idx === -1) {
    const d = local.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return { date: d, time: "" };
    return { date: "", time: "" };
  }
  const date = local.slice(0, idx);
  const hhmm = local.slice(idx + 1, idx + 6);
  return {
    date,
    time: normalizeTimeToFiveMinutes(hhmm),
  };
}

function splitListingFromInitial(iso: string | null | undefined): {
  date: string;
  time: string;
} {
  if (!iso?.trim()) return { date: "", time: "" };
  const local = toDatetimeLocalValue(iso);
  return splitLocalDatetimeString(local);
}

/** Combine listing date + time like a single `datetime-local` value. */
function buildListingLocal(dateStr: string, timeStr: string): string {
  const d = dateStr.trim();
  const t = timeStr.trim()
    ? normalizeTimeToFiveMinutes(timeStr)
    : "";
  if (!d) return "";
  if (!t) return "";
  return normalizeDatetimeLocalToFiveMinutes(`${d}T${t}`);
}

/** Tomorrow at noon local — sensible default when switching to Scheduled listing. */
function defaultListingScheduleLocal(): { date: string; time: string } {
  return {
    date: addOneCalendarDay(todayLocalYmd()),
    time: DEFAULT_LISTING_SCHEDULE_TIME,
  };
}

function listingStatusSelectClass(statusValue: string) {
  return cn(
    "flex h-10 w-full rounded-md border-2 px-3 py-2 text-sm font-medium shadow-xs outline-none transition-colors sm:h-11",
    statusValue === "DRAFT" &&
      "border-pink-400 bg-pink-50 text-pink-950 dark:border-pink-500 dark:bg-pink-950/35 dark:text-pink-50",
    statusValue === "SCHEDULED" &&
      "border-yellow-500 bg-yellow-50 text-yellow-950 dark:border-yellow-600 dark:bg-yellow-950/35 dark:text-yellow-50",
    statusValue === "PUBLISHED" &&
      "border-green-600 bg-green-50 text-green-950 dark:border-green-700 dark:bg-green-950/35 dark:text-green-50"
  );
}

/** Red asterisk for fields required when creating an event (hidden on edit). */
function CreateRequiredMark({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="text-destructive" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

function FormPrimaryActions({
  loading,
  destructiveBusy,
}: {
  loading: boolean;
  destructiveBusy?: boolean;
}) {
  const busy = loading || destructiveBusy;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href="/dashboard/events"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "min-w-[10rem] inline-flex justify-center"
        )}
      >
        Cancel
      </Link>
      <Button type="submit" disabled={busy} className="min-w-[10rem]">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save changes
      </Button>
    </div>
  );
}

function FormEditBottomBar({
  loading,
  destructiveBusy,
  cloneBusy,
  showArchive,
  onCloneClick,
  onArchiveClick,
  onDeleteClick,
}: {
  loading: boolean;
  destructiveBusy: boolean;
  cloneBusy: boolean;
  showArchive: boolean;
  onCloneClick: () => void;
  onArchiveClick: () => void;
  onDeleteClick: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
      <FormPrimaryActions
        loading={loading}
        destructiveBusy={destructiveBusy || cloneBusy}
      />
      <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
        <Button
          type="button"
          variant="outline"
          disabled={loading || destructiveBusy || cloneBusy}
          className="gap-1.5"
          onClick={onCloneClick}
        >
          {cloneBusy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Copy className="size-4" />
          )}
          Clone event
        </Button>
        {showArchive ? (
          <Button
            type="button"
            variant="outline"
            disabled={loading || destructiveBusy || cloneBusy}
            onClick={onArchiveClick}
          >
            Archive event
          </Button>
        ) : null}
        <Button
          type="button"
          variant="destructive"
          disabled={loading || destructiveBusy || cloneBusy}
          onClick={onDeleteClick}
        >
          Permanently delete
        </Button>
      </div>
    </div>
  );
}

function describeUnparseableApiResponse(
  verb: string,
  parsed: { status: number; rawPreview: string | null }
): string {
  const p = parsed.rawPreview?.trim();
  if (p) {
    return `${verb} (HTTP ${parsed.status}): ${p.length > 300 ? `${p.slice(0, 300)}…` : p}`;
  }
  return `${verb} (HTTP ${parsed.status}). The server returned empty or non-JSON. Check the terminal running next dev, or run: npx prisma db push`;
}

export type EventOrganizerContactRow = {
  name: string;
  email: string;
};

export function EventForm({
  initial,
  organizations = [],
  prefillHostingOrgId,
  betweenOrganizerAndActions,
  eventId,
  initialTiers,
  eventOrganizerContacts,
}: {
  initial?: EventInitial;
  organizations?: OrgOption[];
  /** When creating an event, pre-select this organization id (must be in `organizations`). */
  prefillHostingOrgId?: string;
  /** Edit page only: rendered after “Event organizer” and before Cancel / Save / Archive / Delete. */
  betweenOrganizerAndActions?: ReactNode;
  eventId?: string;
  initialTiers?: TierRow[];
  /** Users with the Organizer staff role — receive registrant messages for this event. */
  eventOrganizerContacts?: EventOrganizerContactRow[];
}) {
  const router = useRouter();
  const isEdit = Boolean(initial);

  const legacyContact = splitLegacyContact(
    initial?.contactFirstName,
    initial?.contactLastName,
    initial?.contactName
  );

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [destructiveAction, setDestructiveAction] = useState<
    "archive" | "delete" | null
  >(null);
  const [cloneBusy, setCloneBusy] = useState(false);

  const persistedEventStatus = initial?.persistedEventStatus;
  const showArchiveButton =
    isEdit &&
    persistedEventStatus !== undefined &&
    persistedEventStatus !== "ARCHIVED";

  const [hostingOrgId, setHostingOrgId] = useState(
    () => initial?.orgId ?? prefillHostingOrgId ?? ""
  );

  function timeZoneForOrgId(orgId: string): EventTimeZoneIana {
    if (!orgId || orgId === ADD_ORGANIZATION_SELECT_VALUE) {
      return DEFAULT_EVENT_TIME_ZONE;
    }
    const org = organizations?.find((o) => o.id === orgId);
    return timeZoneForUsState(org?.clubState);
  }

  function applyOrganizationTimeZone(orgId: string) {
    const tz = timeZoneForOrgId(orgId);
    setScheduleRows((prev) => prev.map((r) => ({ ...r, timeZone: tz })));
  }

  function applyVenueTimeZone(state: string) {
    const code = state.trim();
    if (!code) return;
    const tz = timeZoneForUsState(code);
    setScheduleRows((prev) => prev.map((r) => ({ ...r, timeZone: tz })));
  }
  const [name, setName] = useState(initial?.name ?? "");
  const [estimatedCarCount, setEstimatedCarCount] = useState<number | null>(
    initial?.estimatedCarCount ?? null
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [venue, setVenue] = useState(initial?.venue ?? "");
  const [street, setStreet] = useState(initial?.street ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [stateVal, setStateVal] = useState(initial?.state ?? "");
  const [zip, setZip] = useState(initial?.zip ?? "");

  const [eventLocationQuery, setEventLocationQuery] = useState("");
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const [previewLat, setPreviewLat] = useState<number | null>(
    initial?.lat ?? null
  );
  const [previewLng, setPreviewLng] = useState<number | null>(
    initial?.lng ?? null
  );

  const [mapImgError, setMapImgError] = useState(false);

  function clearResolvedCoords() {
    setPreviewLat(null);
    setPreviewLng(null);
    setMapImgError(false);
  }

  const hasVenueData = Boolean(venue || street || city || stateVal || zip);
  const [showVenueDetails, setShowVenueDetails] = useState(hasVenueData);

  const hasCoords =
    previewLat != null &&
    previewLng != null &&
    Number.isFinite(previewLat) &&
    Number.isFinite(previewLng);

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  async function runLocationSearch() {
    const q = eventLocationQuery.trim();
    if (q.length < 3) return;
    setLocationSearchLoading(true);
    setError("");
    try {
      const res = await fetch("/api/maps/resolve-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = (await res.json()) as { error?: string } & Partial<{
        venue: string;
        street: string;
        city: string;
        state: string;
        zip: string;
        lat: number;
        lng: number;
      }>;
      if (!res.ok) {
        setError(data.error ?? "Location search failed.");
        return;
      }
      setVenue(data.venue ?? "");
      setStreet(data.street ?? "");
      setCity(data.city ?? "");
      setStateVal(data.state ?? "");
      setZip(data.zip ?? "");
      if (data.state?.trim()) {
        applyVenueTimeZone(data.state);
      }
      if (
        typeof data.lat === "number" &&
        typeof data.lng === "number" &&
        Number.isFinite(data.lat) &&
        Number.isFinite(data.lng)
      ) {
        setPreviewLat(data.lat);
        setPreviewLng(data.lng);
      }
    } catch {
      setError("Location search failed.");
    } finally {
      setLocationSearchLoading(false);
    }
  }

  const [feeType, setFeeType] = useState<string>(() =>
    initial ? initial.registrationFeeType ?? "FREE" : "PAID"
  );
  const [feeDollars, setFeeDollars] = useState<number | null>(() =>
    initial ? initial.registrationFeeDollars ?? null : 0
  );

  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>(() =>
    scheduleRowsFromInitial(
      initial,
      !initial
        ? timeZoneForUsState(
            organizations?.find(
              (o) => o.id === (prefillHostingOrgId ?? "")
            )?.clubState
          )
        : DEFAULT_EVENT_TIME_ZONE
    )
  );

  const [rainDateEnabled, setRainDateEnabled] = useState(() =>
    Boolean(initial?.rainDate)
  );
  const [rainDateYmd, setRainDateYmd] = useState(() =>
    initial?.rainDate ? toDateInput(initial.rainDate) : ""
  );

  useEffect(() => {
    if (!isEdit && prefillHostingOrgId) {
      applyOrganizationTimeZone(prefillHostingOrgId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply club state TZ once on create with ?orgId=
  }, []);

  const [contactFirstName, setContactFirstName] = useState(legacyContact.first);
  const [contactLastName, setContactLastName] = useState(legacyContact.last);
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? "");

  const [eventWebsite, setEventWebsite] = useState(
    initial?.eventWebsite ?? ""
  );
  const [instagram, setInstagram] = useState(initial?.socialHashtag ?? "");

  const [eventType, setEventType] = useState(initial?.eventType ?? "car_show");
  const [status, setStatus] = useState<"DRAFT" | "SCHEDULED" | "PUBLISHED">(
    initial?.status ?? "DRAFT"
  );
  const statusReadOnly = initial?.statusReadOnly ?? false;

  const [listingScheduledDate, setListingScheduledDate] = useState(() =>
    splitListingFromInitial(initial?.listingScheduledAt).date
  );
  const [listingScheduledTime, setListingScheduledTime] = useState(() =>
    splitListingFromInitial(initial?.listingScheduledAt).time
  );

  const [scheduledListingDialogOpen, setScheduledListingDialogOpen] =
    useState(false);
  const [flatPlatformFeeDialogOpen, setFlatPlatformFeeDialogOpen] =
    useState(false);
  const [payingFlatPlatformFee, setPayingFlatPlatformFee] = useState(false);

  const [flyer, setFlyer] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  function handleFlyerChange(file: File | null) {
    setFlyer(file);
    if (flyerPreview && !initial?.flyerUrl) URL.revokeObjectURL(flyerPreview);
    if (file && file.type.startsWith("image/")) {
      setFlyerPreview(URL.createObjectURL(file));
    } else {
      setFlyerPreview(null);
    }
  }

  function handleLogoChange(file: File | null) {
    setLogo(file);
    if (logoPreview && !initial?.logoUrl) URL.revokeObjectURL(logoPreview);
    if (file && file.type.startsWith("image/")) {
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoPreview(null);
    }
  }

  const flyerThumb = flyerPreview ?? initial?.flyerUrl ?? null;
  const logoThumb = logoPreview ?? initial?.logoUrl ?? null;

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxKind, setLightboxKind] = useState<"flyer" | "logo" | "map" | null>(null);

  function openLightbox(src: string, kind: "flyer" | "logo" | "map") {
    setLightboxSrc(src);
    setLightboxKind(kind);
  }

  function closeLightbox() {
    setLightboxSrc(null);
    setLightboxKind(null);
  }

  const hostingLocked = Boolean(isEdit && initial?.orgId);

  function onHostingOrganizationChange(value: string) {
    setHostingOrgId(value);
    if (!isEdit && !stateVal.trim()) {
      applyOrganizationTimeZone(value);
    }
  }

  function onListingStatusChange(next: "DRAFT" | "SCHEDULED" | "PUBLISHED") {
    setStatus(next);
    if (next === "DRAFT") {
      setListingScheduledDate("");
      setListingScheduledTime("");
    } else if (next === "PUBLISHED") {
      const sp = splitLocalDatetimeString(
        toDatetimeLocalValue(new Date().toISOString())
      );
      setListingScheduledDate(sp.date);
      setListingScheduledTime(sp.time);
    } else if (next === "SCHEDULED") {
      if (!listingScheduledDate.trim() && !listingScheduledTime.trim()) {
        const def = defaultListingScheduleLocal();
        setListingScheduledDate(def.date);
        setListingScheduledTime(def.time);
      } else if (listingScheduledDate.trim() && !listingScheduledTime.trim()) {
        setListingScheduledTime(DEFAULT_LISTING_SCHEDULE_TIME);
      } else if (!listingScheduledDate.trim() && listingScheduledTime.trim()) {
        setListingScheduledDate(addOneCalendarDay(todayLocalYmd()));
      }
    }
  }

  function handleListingScheduledChange(nextDate: string, nextTime: string) {
    const resolvedTime =
      nextDate.trim() && !nextTime.trim()
        ? DEFAULT_LISTING_SCHEDULE_TIME
        : nextTime;

    setListingScheduledDate(nextDate);
    setListingScheduledTime(resolvedTime);
  }

  function addScheduleRow() {
    setScheduleRows((prev) => {
      const last = prev[prev.length - 1]!;
      const anchor =
        last.date?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(last.date)
          ? last.date
          : todayLocalYmd();
      const nextDate = addOneCalendarDay(anchor);
      return [
        ...prev,
        {
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `r-${Date.now()}`,
          date: nextDate,
          startTime: last.startTime,
          endTime: last.endTime,
          timeZone: last.timeZone,
        },
      ];
    });
  }

  function removeScheduleRow(id: string) {
    setScheduleRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.id !== id);
    });
  }

  function updateScheduleRow(id: string, patch: Partial<ScheduleRow>) {
    setScheduleRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  }

  async function fetchFlatPlatformFeeUnpaid(eventId: string): Promise<boolean> {
    const res = await fetch(`/api/events/${eventId}/payment-settings`, {
      credentials: "same-origin",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      platformFeeMode?: string;
      platformSetupFeeCollected?: boolean;
    };
    return (
      data.platformFeeMode === "FLAT_EVENT" &&
      data.platformSetupFeeCollected !== true
    );
  }

  async function handlePayFlatPlatformFee() {
    if (!initial?.id) return;
    setPayingFlatPlatformFee(true);
    try {
      const res = await fetch(
        `/api/events/${initial.id}/platform-setup-fee/checkout`,
        { method: "POST", credentials: "same-origin" }
      );
      const parsed = await readResponseJson<{ error?: string; checkoutUrl?: string }>(
        res
      );
      if (!parsed.bodyIsJson || !parsed.data) {
        throw new Error("Could not start platform fee payment");
      }
      const data = parsed.data;
      if (!res.ok) throw new Error(data.error ?? "Failed to start checkout");
      if (data.checkoutUrl) {
        await redirectToStripeCheckout(data.checkoutUrl);
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start platform fee payment"
      );
      setFlatPlatformFeeDialogOpen(false);
    } finally {
      setPayingFlatPlatformFee(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!feeType) {
        setError("Select a registration fee type.");
        return;
      }

      if (!isEdit) {
        const hasLocation =
          venue.trim().length >= 2 ||
          (street.trim().length > 0 && city.trim().length > 0);
        if (!hasLocation) {
          setError(
            "Enter an event location: add a venue name, or street and city."
          );
          return;
        }
        for (const row of scheduleRows) {
          if (!row.startTime?.trim()) {
            setError("Enter a start time for each event day.");
            return;
          }
        }
        if (!contactFirstName.trim()) {
          setError("Enter the contact first name.");
          return;
        }
        if (!contactLastName.trim()) {
          setError("Enter the contact last name.");
          return;
        }
        if (!contactEmail.trim()) {
          setError("Enter the contact email address.");
          return;
        }
      }

      if (!isOptionalContactEmailValid(contactEmail)) {
        setError(CONTACT_EMAIL_INVALID_MESSAGE);
        return;
      }

      if (!statusReadOnly && status === "SCHEDULED") {
        const listingDate = listingScheduledDate.trim();
        const listingTime = listingScheduledTime.trim();
        if (!listingDate || !listingTime) {
          setScheduledListingDialogOpen(true);
          return;
        }
        const iso = datetimeLocalToIso(
          buildListingLocal(listingDate, listingTime)
        );
        if (!iso || new Date(iso).getTime() <= Date.now()) {
          setScheduledListingDialogOpen(true);
          return;
        }
      }

      if (
        !statusReadOnly &&
        (status === "PUBLISHED" || status === "SCHEDULED") &&
        isEdit &&
        initial?.id
      ) {
        const flatFeeUnpaid = await fetchFlatPlatformFeeUnpaid(initial.id);
        if (flatFeeUnpaid) {
          setFlatPlatformFeeDialogOpen(true);
          return;
        }
      }

      for (const row of scheduleRows) {
        if (!row.date?.trim()) {
          setError("Each event day needs a date.");
          return;
        }
      }

      if (!isEdit) {
        for (const row of scheduleRows) {
          if (row.date && isYmdBeforeLocalToday(row.date)) {
            setError("Event date cannot be in the past.");
            return;
          }
        }
        if (rainDateEnabled && rainDateYmd.trim() && isYmdBeforeLocalToday(rainDateYmd)) {
          setError("Rain date cannot be in the past.");
          return;
        }
      }

      if (rainDateEnabled && !rainDateYmd.trim()) {
        setError("Enter a rain date or turn off Add Rain Date.");
        return;
      }

      let resolvedHostingOrgId: string | null = null;
      if (!hostingLocked && hostingOrgId) {
        resolvedHostingOrgId = hostingOrgId;
      }

      const contactFull = [contactFirstName, contactLastName]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" ");

      const dailyHoursPayload = scheduleRows.map((r) => ({
        date: r.date,
        startTime: r.startTime.trim() ? r.startTime : null,
        endTime: r.endTime.trim() ? r.endTime : null,
        timeZone: r.timeZone,
      }));

      const baseFields: Record<string, unknown> = {
        name,
        estimatedCarCount,
        description: description || undefined,
        venue: venue || undefined,
        street: street || undefined,
        city: city || undefined,
        state: stateVal || undefined,
        zip: zip || undefined,
        ...(previewLat != null &&
        previewLng != null &&
        Number.isFinite(previewLat) &&
        Number.isFinite(previewLng)
          ? { lat: previewLat, lng: previewLng }
          : {}),
        dailyHours: dailyHoursPayload,
        rainDate:
          rainDateEnabled && rainDateYmd.trim() ? rainDateYmd.trim() : null,
        registrationFeeType: feeType,
        registrationFeeDollars:
          feeType === "FREE" || feeType === "PAID_TIERED"
            ? null
            : feeType === "PAID"
              ? feeDollars ?? 0
              : feeDollars,
        contactFirstName: contactFirstName.trim() || undefined,
        contactLastName: contactLastName.trim() || undefined,
        contactName: contactFull || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone.trim() ? contactPhone : undefined,
        eventWebsite: eventWebsite.trim() || undefined,
        socialHashtag: instagram.trim() || undefined,
        eventType: eventType || undefined,
      };

      if (!isEdit && resolvedHostingOrgId) {
        baseFields.orgId = resolvedHostingOrgId;
      }
      if (isEdit && initial && !initial.orgId && resolvedHostingOrgId) {
        baseFields.orgId = resolvedHostingOrgId;
      }

      if (!statusReadOnly) {
        baseFields.status = status;
        let listingPayload: string | null = null;
        if (status === "DRAFT") listingPayload = null;
        else if (status === "PUBLISHED")
          listingPayload = new Date().toISOString();
        else
          listingPayload = datetimeLocalToIso(
            buildListingLocal(listingScheduledDate, listingScheduledTime)
          );
        baseFields.listingScheduledAt = listingPayload;
      }

      let eventId = initial?.id;

      if (isEdit && initial) {
        const res = await fetch(`/api/events/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(baseFields),
        });
        const parsed = await readResponseJson<{ error?: string }>(res);
        if (!parsed.bodyIsJson || !parsed.data) {
          setError(describeUnparseableApiResponse("Could not save event", parsed));
          return;
        }
        const data = parsed.data;
        if (!res.ok) {
          const d = data as { error?: string; detail?: string };
          const msg = d.error ?? "Could not save event";
          const extra =
            typeof d.detail === "string" && d.detail ? ` — ${d.detail}` : "";
          if (
            typeof msg === "string" &&
            msg.includes("Scheduled Listing must have")
          ) {
            setScheduledListingDialogOpen(true);
          } else if (
            typeof msg === "string" &&
            msg.includes(FLAT_PLATFORM_FEE_UNPAID_LISTING_MESSAGE.slice(0, 40))
          ) {
            setFlatPlatformFeeDialogOpen(true);
          } else {
            setError(msg + extra);
          }
          return;
        }
      } else {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(baseFields),
        });
        const parsed = await readResponseJson<{
          error?: string;
          id?: string;
        }>(res);
        if (!parsed.bodyIsJson || !parsed.data) {
          setError(describeUnparseableApiResponse("Could not create event", parsed));
          return;
        }
        const data = parsed.data;
        if (!res.ok) {
          const d = data as { error?: string; detail?: string };
          const msg = d.error ?? "Could not create event";
          const extra =
            typeof d.detail === "string" && d.detail ? ` — ${d.detail}` : "";
          if (
            typeof msg === "string" &&
            msg.includes("Scheduled Listing must have")
          ) {
            setScheduledListingDialogOpen(true);
          } else {
            setError(msg + extra);
          }
          return;
        }
        eventId = data.id as string;
        if (!eventId) {
          setError("Could not create event (missing id).");
          return;
        }
      }

      if (eventId && (flyer || logo)) {
        const fd = new FormData();
        if (flyer) fd.append("flyer", flyer);
        if (logo) fd.append("logo", logo);
        const up = await fetch(`/api/events/${eventId}/upload`, {
          method: "POST",
          credentials: "same-origin",
          body: fd,
        });
        const upParsed = await readResponseJson<{ error?: string }>(up);
        if (!upParsed.bodyIsJson || !upParsed.data) {
          setError(
            `${describeUnparseableApiResponse("Event saved but upload failed", upParsed)} You can try editing again.`
          );
          router.replace(`/organizer/events/${eventId}/edit`);
          return;
        }
        const upData = upParsed.data;
        if (!up.ok) {
          setError(
            upData.error ??
              "Event saved but image upload failed. You can try editing again."
          );
          router.replace(`/organizer/events/${eventId}/edit`);
          return;
        }
      }

      if (isEdit && initial) {
        window.location.assign("/dashboard/events?updated=1");
      } else {
        window.location.assign("/dashboard/events?created=1");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmArchiveEvent() {
    if (!initial?.id) return;
    setDestructiveAction("archive");
    setError("");
    try {
      const res = await fetch(`/api/events/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      const parsed = await readResponseJson<{ error?: string }>(res);
      if (!parsed.bodyIsJson || !parsed.data) {
        setError(describeUnparseableApiResponse("Could not archive event", parsed));
        setArchiveDialogOpen(false);
        return;
      }
      const data = parsed.data;
      if (!res.ok) {
        setError(data.error ?? "Could not archive event.");
        setArchiveDialogOpen(false);
        return;
      }
      window.location.assign("/dashboard/events?archived=1");
    } catch {
      setError("Something went wrong.");
      setArchiveDialogOpen(false);
    } finally {
      setDestructiveAction(null);
    }
  }

  async function handleCloneEvent() {
    if (!initial?.id) return;
    setCloneBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${initial.id}/clone`, {
        method: "POST",
        credentials: "same-origin",
      });
      const parsed = await readResponseJson<{
        id?: string;
        error?: string;
      }>(res);
      if (!parsed.bodyIsJson || !parsed.data) {
        setError(describeUnparseableApiResponse("Could not clone event", parsed));
        return;
      }
      const data = parsed.data;
      if (!res.ok || !data.id) {
        setError(data.error ?? "Could not clone event.");
        return;
      }
      router.push(`/organizer/events/${data.id}/edit?cloned=1`);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setCloneBusy(false);
    }
  }

  async function confirmDeleteEvent() {
    if (!initial?.id) return;
    setDestructiveAction("delete");
    setError("");
    try {
      const res = await fetch(`/api/events/${initial.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const parsed = await readResponseJson<{ error?: string }>(res);
      if (!parsed.bodyIsJson || !parsed.data) {
        setError(describeUnparseableApiResponse("Could not delete event", parsed));
        setDeleteDialogOpen(false);
        return;
      }
      const data = parsed.data;
      if (!res.ok) {
        setError(data.error ?? "Could not delete event.");
        setDeleteDialogOpen(false);
        return;
      }
      window.location.assign("/dashboard/events?deleted=1");
    } catch {
      setError("Something went wrong.");
      setDeleteDialogOpen(false);
    } finally {
      setDestructiveAction(null);
    }
  }

  const createClubReturnTo =
    isEdit && initial
      ? `/organizer/events/${initial.id}/edit`
      : "/organizer/events/new";
  const createClubHref = `/dashboard/clubs/new?returnTo=${encodeURIComponent(createClubReturnTo)}`;

  const selectedHostingOrg =
    hostingOrgId && hostingOrgId !== ADD_ORGANIZATION_SELECT_VALUE
      ? organizations?.find((o) => o.id === hostingOrgId)
      : undefined;
  const selectedClubLogoUrl = selectedHostingOrg?.logo?.trim() || null;

  return (
    <>
    <form
      onSubmit={onSubmit}
      className={cn(
        "mx-auto space-y-8 pb-12",
        isEdit ? "max-w-6xl" : "max-w-2xl",
      )}
    >
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <FormPrimaryActions
        loading={loading}
        destructiveBusy={destructiveAction !== null}
      />

      <Card>
        <CardHeader>
          <CardTitle>Event organizer</CardTitle>
          <CardDescription>
            {isEdit
              ? "Hosting club or organization for this event."
              : "Choose one of your clubs or create a new one. Only clubs on your profile appear here. The club's home state sets the event time zone."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hostingOrgId">Hosting organization</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                id="hostingOrgId"
                className="flex h-10 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none disabled:cursor-not-allowed disabled:opacity-70 sm:h-11"
                value={hostingOrgId}
                onChange={(e) => onHostingOrganizationChange(e.target.value)}
                disabled={hostingLocked}
              >
                <option value="">Select hosting organization…</option>
                {(organizations ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {formatOrgNameWithClubState(o.name, o.clubState)}
                  </option>
                ))}
              </select>
              {selectedClubLogoUrl ? (
                <EventLogo
                  src={selectedClubLogoUrl}
                  alt={
                    selectedHostingOrg?.name
                      ? `${selectedHostingOrg.name} logo`
                      : "Club logo"
                  }
                  size="clubForm"
                  shape="square"
                  className="shrink-0"
                  title={
                    selectedHostingOrg?.name
                      ? `Hosting club: ${selectedHostingOrg.name}`
                      : undefined
                  }
                />
              ) : null}
              {!hostingLocked ? (
                <Link
                  href={createClubHref}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-10 shrink-0 whitespace-nowrap no-underline sm:h-11",
                  )}
                >
                  Create New Club
                </Link>
              ) : null}
            </div>
            {hostingLocked ? (
              <p className="text-xs italic text-muted-foreground">
                Hosting organization can&apos;t be changed here after it&apos;s set.
              </p>
            ) : null}
          </div>
          {isEdit && eventOrganizerContacts !== undefined ? (
            <div className="rounded-md border border-border bg-muted/25 px-3 py-2.5 text-xs">
              <p className="font-medium text-foreground">Message &amp; refund inbox</p>
              <p className="mt-1 text-muted-foreground">
                Logged-in registrants can message the event organizer about this
                show or request a refund. Those messages go to the organizer
                account(s) listed here (same as the{" "}
                <strong>Organizer</strong> role under Event Staffing).
              </p>
              {eventOrganizerContacts.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {eventOrganizerContacts.map((c) => (
                    <li key={c.email} className="text-foreground">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground"> · {c.email}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-amber-800 dark:text-amber-200">
                  No organizer is assigned yet. Add at least one person with the
                  Organizer role under <strong>Event Staffing</strong> so
                  registrants can reach you.
                </p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <div className="min-w-0">
              <CardTitle>Event Details</CardTitle>
              <CardDescription>
                Name, listing status, and registration settings for this event.
              </CardDescription>
            </div>
            {isEdit && initial?.showNumber != null ? (
              <p className="shrink-0 text-right text-sm text-muted-foreground">
                Car show number{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {formatEventShowNumber(initial.showNumber)}
                </span>
              </p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!statusReadOnly ? (
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-[minmax(10rem,1.25fr)_minmax(9.45rem,1fr)_minmax(0,calc(13.75rem/0.9))] sm:items-end sm:gap-3">
              <div className="min-w-0 space-y-2">
                <Label htmlFor="listingStatus">Event listing status</Label>
                <select
                  id="listingStatus"
                  className={listingStatusSelectClass(status)}
                  value={status}
                  onChange={(e) =>
                    onListingStatusChange(
                      e.target.value as "DRAFT" | "SCHEDULED" | "PUBLISHED"
                    )
                  }
                >
                  <option value="DRAFT">Draft</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="PUBLISHED">Published-LIVE</option>
                </select>
              </div>
              <div className="min-w-0 space-y-2 sm:min-w-[9.45rem]">
                <Label htmlFor="listingScheduledDate">
                  Listing scheduled date
                </Label>
                <Input
                  id="listingScheduledDate"
                  type="date"
                  min={todayLocalYmd()}
                  value={
                    status === "DRAFT" ? "" : listingScheduledDate
                  }
                  disabled={status === "DRAFT" || status === "PUBLISHED"}
                  onChange={(e) =>
                    handleListingScheduledChange(
                      e.target.value,
                      listingScheduledTime
                    )
                  }
                  className={cn(
                    "min-w-0 font-mono text-sm tabular-nums sm:min-w-[9.45rem]",
                    (status === "DRAFT" || status === "PUBLISHED") &&
                      "cursor-not-allowed opacity-60"
                  )}
                />
              </div>
              <QuarterHourTimePickers
                idPrefix="listing-scheduled"
                label="Listing scheduled time"
                value={
                  status === "DRAFT" ? "" : listingScheduledTime
                }
                disabled={status === "DRAFT" || status === "PUBLISHED"}
                onChange={(t) =>
                  handleListingScheduledChange(listingScheduledDate, t)
                }
              />
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              Event listing status is managed from the lifecycle workflow.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(8.5rem,11rem)]">
            <div className="space-y-2">
              <Label htmlFor="name">
                Event name
                <CreateRequiredMark show={!isEdit} />
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                aria-required="true"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedCarCount">Est # of cars</Label>
              <Input
                id="estimatedCarCount"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="e.g. 120"
                value={estimatedCarCount === null ? "" : estimatedCarCount}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    setEstimatedCarCount(null);
                    return;
                  }
                  const n = parseInt(v, 10);
                  if (!Number.isNaN(n) && n >= 0) {
                    setEstimatedCarCount(n);
                  }
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="eventType">Event type</Label>
              <select
                id="eventType"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none sm:h-11"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              >
                <option value="car_show">Car show</option>
                <option value="cruise_in">Cruise-in</option>
                <option value="meet">Meet-up</option>
                <option value="track">Track / autocross</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationFeeType">Registration fee type</Label>
              <select
                id="registrationFeeType"
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none sm:h-11",
                  !feeType && "text-muted-foreground"
                )}
                value={feeType}
                onChange={(e) => {
                  const v = e.target.value;
                  setFeeType(v);
                  if (v === "FREE" || v === "PAID_TIERED") setFeeDollars(null);
                  else if (v === "PAID") setFeeDollars((d) => (d == null ? 0 : d));
                }}
                required
              >
                <option value="">Select Registration Fee Type</option>
                <option value="FREE">Free</option>
                <option value="PAID">Paid - Flat Rate</option>
                <option value="PAID_TIERED">Paid - Tiered Registration Fees</option>
                <option value="DONATION">Donation</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationFee">
                {feeType === "DONATION" ? "Suggested donation" : "Registration fee"}
              </Label>
              <CurrencyDollarsInput
                id="registrationFee"
                value={feeDollars}
                onChange={setFeeDollars}
                disabled={feeType === "FREE" || feeType === "PAID_TIERED" || feeType === ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {feeType === "PAID_TIERED" && eventId ? (
        <CollapsibleCard title="Registration Tiers" defaultOpen>
          <TierManager eventId={eventId} initialTiers={initialTiers ?? []} />
        </CollapsibleCard>
      ) : feeType && feeType !== "" && feeType !== "PAID_TIERED" ? (
        <p className="text-sm text-muted-foreground">
          {feeType === "FREE" || feeType === "PAID" || feeType === "DONATION"
            ? "Registrants use a single General Admission tier automatically. Set the fee or suggested donation above."
            : null}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Event date/time</CardTitle>
          <CardDescription>
            Use the calendar control for each event day (new events cannot use past
            dates). Add a row when hours differ by day; new rows start the day after
            the previous row—set the first date before adding another day.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {(() => {
            const lastScheduleRow = scheduleRows[scheduleRows.length - 1];
            const canAddAnotherDay =
              !!lastScheduleRow?.date?.trim() &&
              /^\d{4}-\d{2}-\d{2}$/.test(lastScheduleRow.date);
            return (
              <div className="min-w-0 space-y-3">
                {scheduleRows.map((row, index) => {
                  const isLast = index === scheduleRows.length - 1;
                  const canRemove = scheduleRows.length > 1;
                  const showColumnLabels = index === 0;
                  const labelSpacer = showColumnLabels ? null : (
                    <span className="block h-5" aria-hidden />
                  );
                  return (
                    <div key={row.id} className={SCHEDULE_ROW}>
                      <div className={SCHEDULE_DATE_COL}>
                        {showColumnLabels ? (
                          <Label htmlFor={`event-date-${row.id}`}>
                            Event date
                            <CreateRequiredMark show={!isEdit} />
                          </Label>
                        ) : (
                          labelSpacer
                        )}
                        <Input
                          id={`event-date-${row.id}`}
                          type="date"
                          autoComplete="off"
                          aria-required={!isEdit ? true : undefined}
                          min={!isEdit ? todayLocalYmd() : undefined}
                          value={row.date}
                          onChange={(e) =>
                            updateScheduleRow(row.id, {
                              date: e.target.value,
                            })
                          }
                          className="min-w-0 font-mono text-sm tabular-nums"
                        />
                      </div>
                      <div className={SCHEDULE_TIME_COL}>
                        {!showColumnLabels ? labelSpacer : null}
                        <QuarterHourTimePickers
                          idPrefix={`start-${row.id}`}
                          label="Start time"
                          labelSrOnly={!showColumnLabels}
                          showRequiredAsterisk={!isEdit && showColumnLabels}
                          inputRequired={!isEdit}
                          compact
                          value={row.startTime}
                          onChange={(startTime) =>
                            updateScheduleRow(row.id, {
                              startTime: normalizeTimeToFiveMinutes(startTime),
                            })
                          }
                        />
                      </div>
                      <div className={SCHEDULE_TIME_COL}>
                        {!showColumnLabels ? labelSpacer : null}
                        <QuarterHourTimePickers
                          idPrefix={`end-${row.id}`}
                          label="End time"
                          labelSrOnly={!showColumnLabels}
                          compact
                          value={row.endTime}
                          onChange={(endTime) =>
                            updateScheduleRow(row.id, {
                              endTime: normalizeTimeToFiveMinutes(endTime),
                            })
                          }
                        />
                      </div>
                      <div className={SCHEDULE_TZ_COL}>
                        {showColumnLabels ? (
                          <Label htmlFor={`tz-${row.id}`}>
                            Time zone
                            <CreateRequiredMark show={!isEdit} />
                          </Label>
                        ) : (
                          labelSpacer
                        )}
                        <select
                          id={`tz-${row.id}`}
                          className="flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-xs outline-none sm:h-10 sm:text-[13px]"
                          required={!isEdit}
                          aria-required={!isEdit ? true : undefined}
                          value={row.timeZone}
                          onChange={(e) =>
                            updateScheduleRow(row.id, {
                              timeZone: e.target.value as EventTimeZoneIana,
                            })
                          }
                        >
                          {EVENT_TIME_ZONE_OPTIONS.map((z) => (
                            <option key={z.value} value={z.value}>
                              {z.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={SCHEDULE_ACTIONS_COL}>
                        {canRemove ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 shrink-0 sm:h-11 sm:w-11"
                            onClick={() => removeScheduleRow(row.id)}
                            aria-label="Remove this day"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span
                            className="inline-flex h-10 w-10 shrink-0 sm:h-11 sm:w-11"
                            aria-hidden
                          />
                        )}
                        {isLast ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 shrink-0 sm:h-11 sm:w-11"
                            onClick={addScheduleRow}
                            disabled={!canAddAnotherDay}
                            aria-label="Add another day"
                            title={
                              canAddAnotherDay
                                ? undefined
                                : "Enter a valid event date on this row first"
                            }
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span
                            className="inline-flex h-10 w-10 shrink-0 sm:h-11 sm:w-11"
                            aria-hidden
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          <div className="mt-6 border-t border-border pt-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={rainDateEnabled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setRainDateEnabled(checked);
                  if (!checked) setRainDateYmd("");
                }}
                className="size-4 rounded border border-input"
              />
              Add Rain Date
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              Optional backup date if weather postpones the show (common in spring
              and fall).
            </p>
            {rainDateEnabled ? (
              <div className="mt-3 max-w-[9.45rem] space-y-2">
                <Label htmlFor="rain-date">Rain Date</Label>
                <Input
                  id="rain-date"
                  type="date"
                  autoComplete="off"
                  value={rainDateYmd}
                  min={!isEdit ? todayLocalYmd() : undefined}
                  onChange={(e) => setRainDateYmd(e.target.value)}
                  className="min-w-0 font-mono text-sm tabular-nums"
                />
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Venue &amp; address</CardTitle>
          <CardDescription>
            Search to fill fields from Google Places, or enter an address manually.
            We save coordinates for maps and directions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="event-location-search">
                Event location
                <CreateRequiredMark show={!isEdit} />
              </Label>
              <Input
                id="event-location-search"
                value={eventLocationQuery}
                onChange={(e) => setEventLocationQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void runLocationSearch();
                  }
                }}
                placeholder="Venue and city, or street address, city, state…"
                autoComplete="off"
              />
            </div>
            <Button
              type="button"
              className="h-10 shrink-0 gap-2 sm:h-11"
              onClick={() => void runLocationSearch()}
              disabled={
                locationSearchLoading || eventLocationQuery.trim().length < 3
              }
            >
              {locationSearchLoading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Search className="size-4" aria-hidden />
              )}
              Search
            </Button>
          </div>

          <button
            type="button"
            className="text-sm font-medium text-primary hover:underline"
            onClick={() => setShowVenueDetails((v) => !v)}
          >
            {showVenueDetails ? "Hide venue details" : "Show venue details"}
          </button>

          {showVenueDetails && (
            <>
              <div className="space-y-2">
                <Label htmlFor="venue">Venue name</Label>
                <Input
                  id="venue"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Fairgrounds, park name, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="street">Street address</Label>
                <Input
                  id="street"
                  value={street}
                  onChange={(e) => {
                    clearResolvedCoords();
                    setStreet(e.target.value);
                  }}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_5rem_7rem]">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => {
                      clearResolvedCoords();
                      setCity(e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <select
                    id="state"
                    value={stateVal}
                    onChange={(e) => {
                      clearResolvedCoords();
                      const next = e.target.value;
                      setStateVal(next);
                      applyVenueTimeZone(next);
                    }}
                    className={cn(
                      "flex h-10 w-full rounded-md border border-input bg-transparent px-2 py-2 text-sm shadow-xs outline-none sm:h-11",
                      !stateVal && "text-muted-foreground"
                    )}
                  >
                    <option value="">—</option>
                    {stateVal &&
                    !(US_STATE_CODES as readonly string[]).includes(stateVal) ? (
                      <option value={stateVal}>{stateVal}</option>
                    ) : null}
                    {US_STATE_CODES.map((abbr) => (
                      <option key={abbr} value={abbr}>
                        {abbr}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    value={zip}
                    onChange={(e) => {
                      clearResolvedCoords();
                      setZip(e.target.value);
                    }}
                    inputMode="numeric"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-4">
            {hasCoords && mapsApiKey && !mapImgError && (
              <ThumbnailWithEye
                onClick={() =>
                  openLightbox(
                    `https://maps.googleapis.com/maps/api/staticmap?center=${previewLat},${previewLng}&zoom=14&size=800x600&scale=2&markers=color:red%7C${previewLat},${previewLng}&key=${mapsApiKey}`,
                    "map",
                  )
                }
              >
                <img
                  src={`https://maps.googleapis.com/maps/api/staticmap?center=${previewLat},${previewLng}&zoom=14&size=120x120&scale=2&markers=color:red%7C${previewLat},${previewLng}&key=${mapsApiKey}`}
                  alt="Map preview"
                  className="h-[60px] w-[60px] rounded-md border object-cover"
                  onError={() => setMapImgError(true)}
                />
              </ThumbnailWithEye>
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="venue-lat-lng">Latitude / Longitude</Label>
              <Input
                id="venue-lat-lng"
                readOnly
                aria-readonly="true"
                autoComplete="off"
                value={
                  hasCoords
                    ? `${previewLat!.toFixed(6)}, ${previewLng!.toFixed(6)}`
                    : ""
                }
                className={cn(
                  "cursor-default bg-muted/50 font-mono text-sm tabular-nums",
                  "focus-visible:ring-1 focus-visible:ring-ring/30"
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Event contact</CardTitle>
          <CardDescription>Primary contact for exhibitors and attendees.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactFirstName">
                First name
                <CreateRequiredMark show={!isEdit} />
              </Label>
              <Input
                id="contactFirstName"
                value={contactFirstName}
                onChange={(e) => setContactFirstName(e.target.value)}
                autoComplete="given-name"
                required={!isEdit}
                aria-required={!isEdit ? true : undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactLastName">
                Last name
                <CreateRequiredMark show={!isEdit} />
              </Label>
              <Input
                id="contactLastName"
                value={contactLastName}
                onChange={(e) => setContactLastName(e.target.value)}
                autoComplete="family-name"
                required={!isEdit}
                aria-required={!isEdit ? true : undefined}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Phone number</Label>
              <UsPhoneInput
                id="contactPhone"
                value={contactPhone}
                onChange={setContactPhone}
                className={authInputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">
                Email address
                <CreateRequiredMark show={!isEdit} />
              </Label>
              <Input
                id="contactEmail"
                type="email"
                inputMode="email"
                autoComplete="email"
                title={CONTACT_EMAIL_INVALID_MESSAGE}
                placeholder="name@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required={!isEdit}
                aria-required={!isEdit ? true : undefined}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Event marketing</CardTitle>
          <CardDescription>
            Flyer and logo upload to this event&apos;s public folder and appear on
            the registration page. JPEG, PNG, WebP, GIF, or PDF for flyer (max 8 MB).
            Logo images only for the event brand mark.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-medium leading-none">Event flyer</span>
              <div className="flex items-center gap-3">
                {flyerThumb && (
                  <ThumbnailWithEye onClick={() => openLightbox(flyerThumb, "flyer")}>
                    <img
                      src={flyerThumb}
                      alt="Event flyer preview"
                      className="h-12 w-12 rounded-md border object-cover"
                    />
                  </ThumbnailWithEye>
                )}
                <label
                  htmlFor="event-flyer-file"
                  aria-label="Choose event flyer file"
                  className="group flex min-h-9 min-w-0 cursor-pointer items-center gap-2 rounded-md border border-transparent px-0 py-0.5 hover:border-input hover:bg-muted/50"
                >
                  <Upload
                    className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-foreground"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground group-hover:text-foreground">
                    {flyer?.name ?? "Choose file"}
                  </span>
                </label>
              </div>
              <input
                id="event-flyer-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                className="sr-only"
                onChange={(e) => handleFlyerChange(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-medium leading-none">Event Logo</span>
              <div className="flex items-center gap-3">
                {logoThumb && (
                  <ThumbnailWithEye onClick={() => openLightbox(logoThumb, "logo")}>
                    <img
                      src={logoThumb}
                      alt="Event Logo preview"
                      className="h-12 w-[calc(3rem*1.5)] rounded-md border object-contain p-0.5"
                    />
                  </ThumbnailWithEye>
                )}
                <label
                  htmlFor="event-logo-file"
                  aria-label="Choose Event Logo file"
                  className="group flex min-h-9 min-w-0 cursor-pointer items-center gap-2 rounded-md border border-transparent px-0 py-0.5 hover:border-input hover:bg-muted/50"
                >
                  <Upload
                    className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-foreground"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground group-hover:text-foreground">
                    {logo?.name ?? "Choose file"}
                  </span>
                </label>
              </div>
              <input
                id="event-logo-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="eventWebsite">Event website</Label>
              <Input
                id="eventWebsite"
                type="text"
                inputMode="text"
                autoComplete="off"
                value={eventWebsite}
                onChange={(e) => setEventWebsite(e.target.value)}
                placeholder="example.com/your-event"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@yourclub or full profile URL"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {betweenOrganizerAndActions}

      {isEdit ? (
        <FormEditBottomBar
          loading={loading}
          destructiveBusy={destructiveAction !== null}
          cloneBusy={cloneBusy}
          showArchive={showArchiveButton}
          onCloneClick={() => void handleCloneEvent()}
          onArchiveClick={() => setArchiveDialogOpen(true)}
          onDeleteClick={() => setDeleteDialogOpen(true)}
        />
      ) : (
        <FormPrimaryActions loading={loading} />
      )}

      {archiveDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="archive-event-title"
        >
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-lg">
            <p id="archive-event-title" className="text-sm leading-relaxed">
              Archive this event? It will be marked archived and hidden from normal
              listings. You can still delete it later if needed.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setArchiveDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={destructiveAction !== null}
                onClick={() => void confirmArchiveEvent()}
              >
                {destructiveAction === "archive" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Archive
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-event-title"
        >
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-lg">
            <p id="delete-event-title" className="text-sm leading-relaxed">
              Permanently delete this event? This cannot be undone. Registrations,
              staff assignments, and tiers are removed.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={destructiveAction !== null}
                onClick={() => void confirmDeleteEvent()}
              >
                {destructiveAction === "delete" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete permanently
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {scheduledListingDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="scheduled-listing-dialog-title"
        >
          <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
            <p
              id="scheduled-listing-dialog-title"
              className="text-sm leading-relaxed text-foreground"
            >
              Scheduled listing needs a date and time in the future. Choose
              both fields — the time box shows a placeholder until you pick or
              confirm a time.
            </p>
            <div className="mt-6 flex justify-end">
              <Button
                type="button"
                onClick={() => setScheduledListingDialogOpen(false)}
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {flatPlatformFeeDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="flat-platform-fee-dialog-title"
        >
          <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
            <p
              id="flat-platform-fee-dialog-title"
              className="text-sm leading-relaxed text-foreground"
            >
              You selected the Flat Platform Fee option for your event. Before
              publishing the event or scheduling it to be published, you must
              make the Platform Fee payment.{" "}
              <button
                type="button"
                className="font-medium text-primary underline underline-offset-2 hover:text-primary/90 disabled:opacity-50"
                disabled={payingFlatPlatformFee || !initial?.id}
                onClick={() => void handlePayFlatPlatformFee()}
              >
                {payingFlatPlatformFee ? (
                  <>
                    <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />
                    Opening Stripe…
                  </>
                ) : (
                  "Please click here to make the one-time payment for the event through Stripe."
                )}
              </button>
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              You can also pay from Payment Settings below on this page after
              closing this dialog.
            </p>
            <div className="mt-6 flex justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={payingFlatPlatformFee}
                onClick={() => setFlatPlatformFeeDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </form>

    {lightboxSrc && (
      <ImageLightbox
        src={lightboxSrc}
        alt={
          lightboxKind === "flyer"
            ? "Event flyer"
            : lightboxKind === "logo"
              ? "Event / club logo"
              : "Map preview"
        }
        canEdit={lightboxKind === "flyer" || lightboxKind === "logo"}
        onClose={closeLightbox}
        onRemove={
          lightboxKind === "flyer"
            ? () => { handleFlyerChange(null); setFlyerPreview(null); }
            : lightboxKind === "logo"
              ? () => { handleLogoChange(null); setLogoPreview(null); }
              : undefined
        }
        onReplace={
          lightboxKind === "flyer"
            ? (file) => handleFlyerChange(file)
            : lightboxKind === "logo"
              ? (file) => handleLogoChange(file)
              : undefined
        }
      />
    )}
    </>
  );
}
