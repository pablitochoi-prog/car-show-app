"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { redirectToStripeCheckout } from "@/lib/session-idle-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Check,
  Car,
  Plus,
  Trash2,
  Tag,
  CreditCard,
  Clock,
  Users,
} from "lucide-react";
import { InlineLogin } from "./inline-login";
import { EventInfoSidebar, type SidebarEvent } from "./event-info-sidebar";
import { GuestRegistrationForm } from "./guest-registration-form";
import { isTierOpen, formatMoney, formatDate } from "./reg-utils";
import { totalPlatformFeeForCheckout, type EventPlatformFeeMode } from "@/lib/event-platform-fee";
import { dollarsToCents } from "@/lib/money";
import { EventSectionEditToolbar } from "@/components/forms/event-section-edit-toolbar";
import {
  REGISTRATION_CLASS_REQUIRED_MSG,
  REGISTRATION_VEHICLE_REQUIRED_MSG,
  loggedInVehiclesHaveRequiredClasses,
} from "@/lib/registration-vehicle-classes";
import { RegisteredVehicleEditor } from "./registered-vehicle-editor";
import { AddVehicleForm } from "@/components/forms/add-vehicle-form";
import { RegistrationContactSection } from "./registration-contact-section";
import {
  RegistrationContactSheet,
  type ProfilePatchExtras,
} from "./registration-contact-sheet";
import { ThumbnailWithEye, ImageLightbox } from "@/components/ui/image-lightbox";
import { VehiclePhotoDisplay, resolveVehiclePhotoSrc } from "@/components/vehicle/vehicle-photo-display";
import { formatVinMaskLastFour } from "@/lib/vehicle-vin";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { ContactOrganizerButton } from "@/components/messages/contact-organizer-button";
import { SmsNotificationsOptInField } from "@/components/sms/sms-notifications-opt-in-field";
import { formatEventShowNumber } from "@/lib/event-show-number";
import {
  emptyRegistrationContact,
  isRegistrationContactComplete,
  type RegistrationContact,
} from "@/lib/registration-contact";
import type { ExistingRegistrationForEvent } from "@/lib/registration-for-event-types";
import { resolvePayableTier } from "@/lib/tiers";
import {
  formatDonationDollarsFromCents,
  parseDonationDollarsInput,
  resolveDonationUnitCents,
  suggestedDonationDollarsInput,
  suggestedDonationTotalDollars,
} from "@/lib/donation";
import { DonationAmountField } from "./donation-amount-field";
import { RegistrationFeeRow } from "./registration-fee-row";
import { CancelRegistrationButton } from "@/components/dashboard/events/cancel-registration-button";
import {
  derivePaidVehicleCount,
  getRegistrationAmounts,
  validateDonationNotDecreasedAfterPayment,
} from "@/lib/registration-payment-display";
import { applyClubRefundAdjustments } from "@/lib/registration-refund-adjustments";
import {
  emptyVehicleSaleListingFormState,
  vehicleSaleListingFormStateFromApi,
  vehicleSaleListingFormStateToPayload,
  type VehicleSaleListingFormState,
} from "@/components/sale/vehicle-sale-listing-fields";
import { VehicleSaleListingDialog } from "@/components/sale/vehicle-sale-listing-dialog";
import { GarageVehicleActionDialog } from "@/components/registration/garage-vehicle-action-dialog";
import type { PaymentStatus, RegistrationStatus } from "@prisma/client";

export type TierOption = {
  id: string;
  name: string;
  priceCents: number;
  opensAt: string | null;
  closesAt: string | null;
  memberOnly: boolean;
};

export type VehicleOption = {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  nickname: string | null;
  vin: string | null;
  photoUrl: string | null;
  notes: string | null;
};

export type PlatformFeeInfo = {
  type: "NONE" | "FIXED" | "PERCENT";
  amountCents: number | null;
  percent: number | null;
} | null;

export type EventCategoryOption = {
  id: string;
  name: string;
};

export type UserContactInitial = RegistrationContact & {
  profileExtras: ProfilePatchExtras;
  smsNotificationsOptInDefault: boolean;
};

type EventRegistrationPageProps = {
  event: SidebarEvent & {
    id: string;
    description: string | null;
    status: string;
    paymentEnabled: boolean;
    platformFeeMode?: EventPlatformFeeMode;
    platformSetupFeeCollected?: boolean;
    eventSetupFeeCents?: number;
    vehicleSaleInquiriesEnabled?: boolean;
  };
  stripeConnectReady: boolean;
  stripeCheckoutAvailable: boolean;
  tiers: TierOption[];
  vehicles: VehicleOption[];
  isLoggedIn: boolean;
  userContact: UserContactInitial | null;
  platformFee: PlatformFeeInfo;
  eventCategories: EventCategoryOption[];
  existingRegistration?: ExistingRegistrationForEvent | null;
  /** Organizer editing another user's registration (PATCH + no checkout redirect). */
  organizerEditMode?: boolean;
  /** Registrant editing their own registration from My Events. */
  editRegistrationMode?: boolean;
  registerApiPath?: string;
  registerMethod?: "POST" | "PATCH";
  afterSaveRedirectHref?: string;
};

export function EventRegistrationPage(props: EventRegistrationPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-12 text-center text-sm text-muted-foreground">
          Loading registration…
        </div>
      }
    >
      <EventRegistrationPageContent {...props} />
    </Suspense>
  );
}

function EventRegistrationPageContent({
  event,
  stripeConnectReady,
  stripeCheckoutAvailable,
  tiers,
  vehicles,
  isLoggedIn,
  userContact,
  platformFee,
  eventCategories,
  existingRegistration = null,
  organizerEditMode = false,
  editRegistrationMode = false,
  registerApiPath,
  registerMethod = "POST",
  afterSaveRedirectHref,
}: EventRegistrationPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isUpdating = !!existingRegistration;
  const isEditRegistration = editRegistrationMode && isUpdating;
  const [submittingAction, setSubmittingAction] = useState<"save" | "pay" | null>(
    null,
  );
  const submitIntentRef = useRef<"save" | "pay">("save");
  const [error, setError] = useState("");
  const [vehicleAddedNotice, setVehicleAddedNotice] = useState(false);
  const [contact, setContact] = useState<RegistrationContact>(() => {
    if (existingRegistration) {
      return {
        ...existingRegistration.contact,
        phone:
          userContact?.phone?.trim() ||
          existingRegistration.contact.phone,
      };
    }
    if (userContact) {
      return {
        firstName: userContact.firstName,
        lastName: userContact.lastName,
        email: userContact.email,
        phone: userContact.phone,
        street: userContact.street,
        city: userContact.city,
        state: userContact.state,
        zip: userContact.zip,
      };
    }
    return emptyRegistrationContact();
  });
  const [contactSheetOpen, setContactSheetOpen] = useState(false);
  const [smsNotificationsOptIn, setSmsNotificationsOptIn] = useState(
    () => userContact?.smsNotificationsOptInDefault ?? false,
  );

  const singleTier = tiers.length === 1 ? tiers[0] : null;
  const [tierId, setTierId] = useState(() => {
    if (existingRegistration?.tierId) return existingRegistration.tierId;
    if (singleTier) return singleTier.id;
    const firstOpen = tiers.find((t) => isTierOpen(t));
    return firstOpen?.id ?? tiers[0]?.id ?? "";
  });

  const [addedGarageVehicles, setAddedGarageVehicles] = useState<VehicleOption[]>(
    [],
  );
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [garageActionVehicleId, setGarageActionVehicleId] = useState<
    string | null
  >(null);
  const [garageVehicleOverrides, setGarageVehicleOverrides] = useState<
    Record<string, VehicleOption>
  >({});
  const [saleDialogVehicleId, setSaleDialogVehicleId] = useState<string | null>(
    null,
  );
  const [saleDialogMode, setSaleDialogMode] = useState<"enable" | "edit">(
    "enable",
  );
  const allGarageVehicles = useMemo(() => {
    const byId = new Map<string, VehicleOption>();
    for (const v of vehicles) {
      byId.set(v.id, garageVehicleOverrides[v.id] ?? v);
    }
    for (const v of addedGarageVehicles) {
      byId.set(v.id, garageVehicleOverrides[v.id] ?? v);
    }
    return [...byId.values()];
  }, [vehicles, addedGarageVehicles, garageVehicleOverrides]);
  // Vehicles confirmed into the registration table
  const [registeredVehicles, setRegisteredVehicles] = useState<Set<string>>(
    () => new Set(existingRegistration?.vehicleIds ?? []),
  );
  // Category assignment per vehicle (vehicleId → eventCategoryId)
  const [vehicleCategories, setVehicleCategories] = useState<Record<string, string>>(
    () => ({ ...existingRegistration?.vehicleCategories }),
  );
  const [vehicleNicknames, setVehicleNicknames] = useState<Record<string, string>>(
    () => {
      const registered = new Set(existingRegistration?.vehicleIds ?? []);
      const initial: Record<string, string> = {};
      for (const v of vehicles) {
        if (!registered.has(v.id)) continue;
        initial[v.id] =
          existingRegistration?.vehicleNicknames?.[v.id] ??
          v.nickname?.trim() ??
          "";
      }
      return initial;
    },
  );
  const [vehicleStories, setVehicleStories] = useState<Record<string, string>>(
    () => {
      const registered = new Set(existingRegistration?.vehicleIds ?? []);
      const initial: Record<string, string> = {};
      for (const v of vehicles) {
        if (!registered.has(v.id)) continue;
        initial[v.id] =
          existingRegistration?.vehicleStories?.[v.id] ??
          v.notes?.trim() ??
          "";
      }
      return initial;
    },
  );
  const [vehiclePhotos, setVehiclePhotos] = useState<Record<string, string | null>>(
    () => Object.fromEntries(allGarageVehicles.map((v) => [v.id, v.photoUrl])),
  );
  const [vehicleSaleListings, setVehicleSaleListings] = useState<
    Record<string, VehicleSaleListingFormState>
  >(() => {
    const initial: Record<string, VehicleSaleListingFormState> = {};
    for (const vehicleId of existingRegistration?.vehicleIds ?? []) {
      const saved = existingRegistration?.vehicleSaleListings?.[vehicleId];
      initial[vehicleId] = saved
        ? vehicleSaleListingFormStateFromApi(saved)
        : emptyVehicleSaleListingFormState();
    }
    return initial;
  });
  const saleInquiriesEnabled = event.vehicleSaleInquiriesEnabled === true;
  const [photoConfirmOpen, setPhotoConfirmOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [editingRegisteredVehicles, setEditingRegisteredVehicles] =
    useState(false);
  const [selectedRegisteredForRemoval, setSelectedRegisteredForRemoval] =
    useState<Set<string>>(new Set());
  const [registrationCategories, setRegistrationCategories] =
    useState<EventCategoryOption[]>(eventCategories);
  const isDonationEvent = event.registrationFeeType === "DONATION";
  const suggestedPerVehicleDollars = event.registrationFeeDollars;
  const [donationDollars, setDonationDollars] = useState(() => {
    if (existingRegistration?.amountCents) {
      return formatDonationDollarsFromCents(
        resolveDonationUnitCents(
          existingRegistration.amountCents,
          existingRegistration.platformFeeCents,
        ),
      );
    }
    const count = existingRegistration?.vehicleIds.length ?? 1;
    return suggestedDonationDollarsInput(suggestedPerVehicleDollars, count);
  });
  const prevVehicleCountRef = useRef(
    existingRegistration?.vehicleIds.length ?? 1,
  );

  const registrationReturnPath = editRegistrationMode
    ? `/events/${event.id}/register/edit`
    : `/events/${event.id}`;

  useEffect(() => {
    setRegistrationCategories(eventCategories);
  }, [eventCategories]);

  useEffect(() => {
    void fetch(`/api/events/${event.id}/categories`, {
      credentials: "same-origin",
    })
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data: { categories?: { id: string; name: string }[] } | null) => {
        if (data?.categories?.length) {
          setRegistrationCategories(
            data.categories.map((c) => ({ id: c.id, name: c.name })),
          );
        }
      });
  }, [event.id]);

  useEffect(() => {
    setVehiclePhotos((prev) => {
      const next = { ...prev };
      for (const v of allGarageVehicles) {
        if (next[v.id] === undefined) {
          next[v.id] = v.photoUrl;
        }
      }
      return next;
    });
    setVehicleNicknames((prev) => {
      const next = { ...prev };
      for (const v of allGarageVehicles) {
        if (next[v.id] === undefined && registeredVehicles.has(v.id)) {
          next[v.id] = v.nickname?.trim() ?? "";
        }
      }
      return next;
    });
    setVehicleStories((prev) => {
      const next = { ...prev };
      for (const v of allGarageVehicles) {
        if (next[v.id] === undefined && registeredVehicles.has(v.id)) {
          next[v.id] = v.notes?.trim() ?? "";
        }
      }
      return next;
    });
  }, [allGarageVehicles, registeredVehicles]);

  useEffect(() => {
    const addedId = searchParams.get("addedVehicle");
    if (!addedId) return;

    const vehicle = allGarageVehicles.find((v) => v.id === addedId);
    if (!vehicle) {
      router.refresh();
      return;
    }

    setRegisteredVehicles((prev) => new Set([...prev, addedId]));
    setVehiclePhotos((prev) => ({ ...prev, [addedId]: vehicle.photoUrl }));
    setVehicleNicknames((prev) => ({
      ...prev,
      [addedId]: prev[addedId] ?? vehicle.nickname?.trim() ?? "",
    }));
    setVehicleStories((prev) => ({
      ...prev,
      [addedId]: prev[addedId] ?? vehicle.notes?.trim() ?? "",
    }));
    setVehicleSaleListings((prev) =>
      prev[addedId] ? prev : { ...prev, [addedId]: emptyVehicleSaleListingFormState() },
    );
    setVehicleAddedNotice(true);
    router.replace(registrationReturnPath, { scroll: false });
  }, [searchParams, allGarageVehicles, event.id, router, registrationReturnPath]);

  function handleInlineVehicleAdded(vehicle: {
    id: string;
    year: number;
    make: string;
    model: string;
    trim?: string | null;
    nickname?: string | null;
    vin?: string | null;
    photoUrl?: string | null;
    notes?: string | null;
  }) {
    const option: VehicleOption = {
      id: vehicle.id,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim ?? null,
      nickname: vehicle.nickname ?? null,
      vin: vehicle.vin ?? null,
      photoUrl: vehicle.photoUrl ?? null,
      notes: vehicle.notes ?? null,
    };
    setAddedGarageVehicles((prev) => [
      ...prev.filter((v) => v.id !== option.id),
      option,
    ]);
    setRegisteredVehicles((prev) => new Set([...prev, option.id]));
    setVehiclePhotos((prev) => ({ ...prev, [option.id]: option.photoUrl }));
    setVehicleNicknames((prev) => ({
      ...prev,
      [option.id]: option.nickname?.trim() ?? "",
    }));
    setVehicleStories((prev) => ({
      ...prev,
      [option.id]: option.notes?.trim() ?? "",
    }));
    setVehicleSaleListings((prev) =>
      prev[option.id] ? prev : { ...prev, [option.id]: emptyVehicleSaleListingFormState() },
    );
    setVehicleAddedNotice(true);
    setAddVehicleOpen(false);
    setError("");
  }

  function addVehicleToRegistration(vehicleId: string) {
    setError("");
    const vehicle = allGarageVehicles.find((v) => v.id === vehicleId);
    setRegisteredVehicles((prev) => new Set([...prev, vehicleId]));
    setVehicleNicknames((prev) => ({
      ...prev,
      [vehicleId]: prev[vehicleId] ?? vehicle?.nickname?.trim() ?? "",
    }));
    setVehicleStories((prev) => ({
      ...prev,
      [vehicleId]: prev[vehicleId] ?? vehicle?.notes?.trim() ?? "",
    }));
    setVehicleSaleListings((prev) =>
      prev[vehicleId]
        ? prev
        : { ...prev, [vehicleId]: emptyVehicleSaleListingFormState() },
    );
  }

  function handleGarageVehicleUpdated(vehicle: VehicleOption) {
    setGarageVehicleOverrides((prev) => ({ ...prev, [vehicle.id]: vehicle }));
    setAddedGarageVehicles((prev) =>
      prev.map((v) => (v.id === vehicle.id ? vehicle : v)),
    );
    setVehiclePhotos((prev) => ({ ...prev, [vehicle.id]: vehicle.photoUrl }));
    setVehicleNicknames((prev) => ({
      ...prev,
      [vehicle.id]: vehicle.nickname?.trim() ?? "",
    }));
  }

  function saleListingFor(vehicleId: string): VehicleSaleListingFormState {
    return (
      vehicleSaleListings[vehicleId] ?? emptyVehicleSaleListingFormState()
    );
  }

  function updateSaleListing(
    vehicleId: string,
    next: VehicleSaleListingFormState,
  ) {
    setVehicleSaleListings((prev) => ({ ...prev, [vehicleId]: next }));
  }

  function handleBuyerInquiryCheck(vehicleId: string, checked: boolean) {
    const current = saleListingFor(vehicleId);
    if (checked) {
      updateSaleListing(vehicleId, { ...current, enabled: true });
      setSaleDialogMode("enable");
      setSaleDialogVehicleId(vehicleId);
    } else {
      updateSaleListing(vehicleId, {
        ...current,
        enabled: false,
      });
    }
  }

  async function persistSaleListingFromDialog(
    vehicleId: string,
    listing: VehicleSaleListingFormState,
  ) {
    updateSaleListing(vehicleId, listing);
    if (!isUpdating) return;

    const payload = vehicleSaleListingFormStateToPayload(listing);
    const res = await fetch(
      `/api/events/${event.id}/my-registration/sale-listing`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId, saleListing: payload }),
      },
    );
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      throw new Error(data.error ?? "Could not save listing details.");
    }
  }

  function handleSaleDialogOpenChange(open: boolean) {
    if (open || !saleDialogVehicleId) return;
    const id = saleDialogVehicleId;
    const listing = saleListingFor(id);
    if (!listing.sellerAcknowledged) {
      updateSaleListing(id, {
        ...emptyVehicleSaleListingFormState(),
        listingId: listing.listingId,
      });
    }
    setSaleDialogVehicleId(null);
  }

  function removeVehiclesFromRegistration(vehicleIds: Iterable<string>) {
    const ids = [...vehicleIds];
    if (ids.length === 0) return;
    setRegisteredVehicles((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
    setVehicleCategories((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
    setSelectedRegisteredForRemoval((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }

  function removeSelectedFromRegistration() {
    removeVehiclesFromRegistration(selectedRegisteredForRemoval);
    setEditingRegisteredVehicles(false);
  }

  function toggleRegisteredVehicleSelected(id: string) {
    setSelectedRegisteredForRemoval((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setCategoryForVehicle(vehicleId: string, categoryId: string) {
    setVehicleCategories((prev) => ({ ...prev, [vehicleId]: categoryId }));
  }

  function garageVehiclePhotoSrc(vehicleId: string): string | null {
    const v = allGarageVehicles.find((g) => g.id === vehicleId);
    return resolveVehiclePhotoSrc(vehiclePhotos[vehicleId] ?? v?.photoUrl ?? null);
  }

  function garageVehicleVinMask(vehicleId: string): string | null {
    const v = allGarageVehicles.find((g) => g.id === vehicleId);
    return formatVinMaskLastFour(v?.vin ?? null);
  }

  function hasMissingVehiclePhotos(): boolean {
    for (const v of garageVehicles) {
      if (!vehiclePhotos[v.id]) return true;
    }
    return false;
  }

  const selectedTier = tiers.find((t) => t.id === tierId);
  const garageVehicles = allGarageVehicles.filter((v) =>
    registeredVehicles.has(v.id),
  );
  const availableGarage = allGarageVehicles.filter(
    (v) => !registeredVehicles.has(v.id),
  );
  const totalVehicles = garageVehicles.length;
  const requiresVehicleClass = registrationCategories.length > 0;
  const categoryNameById = useMemo(
    () =>
      Object.fromEntries(registrationCategories.map((c) => [c.id, c.name])),
    [registrationCategories],
  );
  function vehicleClassLabel(vehicleId: string): string {
    const categoryId = vehicleCategories[vehicleId];
    if (!categoryId) {
      return requiresVehicleClass ? "Not selected" : "—";
    }
    return categoryNameById[categoryId] ?? "—";
  }
  const allRegisteredSelected =
    garageVehicles.length > 0 &&
    garageVehicles.every((v) => selectedRegisteredForRemoval.has(v.id));
  const someRegisteredSelected = selectedRegisteredForRemoval.size > 0;
  const allVehiclesHaveClass = loggedInVehiclesHaveRequiredClasses(
    requiresVehicleClass,
    [...registeredVehicles],
    vehicleCategories,
  );
  const missingClassVehicleIds = requiresVehicleClass
    ? garageVehicles
        .filter((v) => !vehicleCategories[v.id])
        .map((v) => v.id)
    : [];
  const canSubmitRegistration =
    totalVehicles > 0 && allVehiclesHaveClass;

  const canRegister =
    ["PUBLISHED", "ACTIVE"].includes(event.status) && tiers.length > 0;

  const donationCents = isDonationEvent
    ? parseDonationDollarsInput(donationDollars)
    : null;

  const payableTierResolution =
    event.registrationFeeType === "PAID_TIERED"
      ? resolvePayableTier(tiers, tierId)
      : null;
  const pricingTier =
    payableTierResolution?.tier ??
    selectedTier ??
    tiers.find((t) => t.id === tierId);

  const feeSummary = (() => {
    const ft = event.registrationFeeType;
    let unitCents = 0;
    let tierLabel = "Free";
    if (ft === "PAID_TIERED" && pricingTier) {
      unitCents = pricingTier.priceCents;
      tierLabel = pricingTier.name;
    } else if (ft === "DONATION") {
      unitCents = donationCents ?? 0;
      tierLabel = "Donation amount";
    } else {
      unitCents = dollarsToCents(event.registrationFeeDollars ?? 0);
      tierLabel = "Registration fee";
    }
    const regTotal = ft === "DONATION" ? unitCents : unitCents * totalVehicles;
    const feeUnitCents =
      ft === "DONATION"
        ? Math.round((suggestedPerVehicleDollars ?? 0) * 100)
        : unitCents;
    const platformFees = totalPlatformFeeForCheckout({
      mode: event.platformFeeMode ?? "CONVENIENCE",
      platformFee: platformFee ?? {
        type: "NONE",
        amountCents: null,
        percent: null,
      },
      unitPriceCents: feeUnitCents,
      vehicleCount: totalVehicles,
      setupFeeCents: event.eventSetupFeeCents ?? 0,
      setupFeeCollected: event.platformSetupFeeCollected ?? false,
    });
    const convFeeCents = platformFees.perVehiclePlatformFeeCents;
    const totalConvFee =
      platformFees.perVehiclePlatformFeeCents * Math.max(totalVehicles, 1);
    const flatSetupFeeCents = platformFees.flatSetupFeeCents;
    let adjustedRegTotal = regTotal;
    const refundedCents = existingRegistration?.refundedCents ?? 0;
    if (
      existingRegistration?.paymentStatus === "PAID" &&
      refundedCents > 0 &&
      ft !== "DONATION" &&
      regTotal > 0
    ) {
      const adjusted = applyClubRefundAdjustments(
        regTotal,
        regTotal,
        refundedCents,
      );
      adjustedRegTotal = adjusted.clubFeeCents;
    }

    const grandTotal = adjustedRegTotal + totalConvFee + flatSetupFeeCents;
    return {
      unitCents,
      regTotal: adjustedRegTotal,
      convFeeCents,
      totalConvFee,
      flatSetupFeeCents,
      grandTotal,
      tierLabel,
    };
  })();

  useEffect(() => {
    if (!isDonationEvent || totalVehicles === 0) return;
    const prevCount = prevVehicleCountRef.current;
    if (prevCount === totalVehicles) return;
    const oldSuggested = suggestedDonationTotalDollars(
      suggestedPerVehicleDollars,
      prevCount,
    );
    prevVehicleCountRef.current = totalVehicles;
    setDonationDollars((prev) => {
      const prevCents = parseDonationDollarsInput(prev);
      if (
        prev.trim() === "" ||
        prevCents === Math.round(oldSuggested * 100)
      ) {
        return suggestedDonationDollarsInput(
          suggestedPerVehicleDollars,
          totalVehicles,
        );
      }
      return prev;
    });
  }, [isDonationEvent, totalVehicles, suggestedPerVehicleDollars]);

  const unitPriceCents = isDonationEvent
    ? (donationCents ?? 0)
    : (pricingTier?.priceCents ?? 0);

  const registrationBalance = getRegistrationAmounts({
    registrationFeeType: event.registrationFeeType ?? "FREE",
    unitPriceCents,
    vehicleCount: totalVehicles,
    registrationStatus:
      (existingRegistration?.registrationStatus as RegistrationStatus) ??
      "PENDING",
    paymentStatus:
      (existingRegistration?.paymentStatus as PaymentStatus | null) ?? null,
    amountCents: existingRegistration?.amountCents ?? null,
    platformFeeCents: existingRegistration?.platformFeeCents ?? null,
    refundedCents: existingRegistration?.refundedCents ?? 0,
    platformFee: platformFee ?? {
      type: "NONE",
      amountCents: null,
      percent: null,
    },
    suggestedDonationPerVehicleDollars: event.registrationFeeDollars,
    platformFeeMode: event.platformFeeMode,
    eventSetupFeeCents: event.eventSetupFeeCents,
    platformSetupFeeCollected: event.platformSetupFeeCollected,
  });

  const paymentAlreadyComplete = registrationBalance.amountDueCents <= 0;
  const isPaidRegistration =
    existingRegistration?.paymentStatus === "PAID";
  const vehiclesPaidForCount =
    isPaidRegistration && unitPriceCents > 0
      ? derivePaidVehicleCount({
          amountPaidCents: existingRegistration?.amountCents ?? 0,
          unitPriceCents,
          platformFee: platformFee ?? {
            type: "NONE",
            amountCents: null,
            percent: null,
          },
          platformFeeMode: event.platformFeeMode,
          eventSetupFeeCents: event.eventSetupFeeCents,
        })
      : 0;
  const vehiclesIncreasedSincePayment =
    isPaidRegistration && totalVehicles > vehiclesPaidForCount;
  const tierPriceWillChangeAtPayment =
    !!payableTierResolution?.tierChanged && !paymentAlreadyComplete;
  const hasBalanceDueOnPaidEdit =
    isEditRegistration &&
    isPaidRegistration &&
    registrationBalance.amountDueCents > 0 &&
    !organizerEditMode;
  const showEditRegistrationPayOptions =
    stripeConnectReady && hasBalanceDueOnPaidEdit;
  const showMakePaymentButton =
    stripeConnectReady &&
    registrationBalance.amountDueCents > 0 &&
    !showEditRegistrationPayOptions &&
    (!isEditRegistration || !isPaidRegistration);
  function validateBeforeSubmit(intent: "save" | "pay"): boolean {
    if (!isRegistrationContactComplete(contact)) {
      setError("Please complete your contact information.");
      return false;
    }
    if (smsNotificationsOptIn && !contact.phone.trim()) {
      setError("Enter a phone number to receive SMS notifications.");
      return false;
    }
    if (!tierId) {
      setError("Please select a registration tier.");
      return false;
    }
    if (totalVehicles === 0) {
      setError(REGISTRATION_VEHICLE_REQUIRED_MSG);
      return false;
    }
    if (
      requiresVehicleClass &&
      !loggedInVehiclesHaveRequiredClasses(
        requiresVehicleClass,
        [...registeredVehicles],
        vehicleCategories,
      )
    ) {
      setError(REGISTRATION_CLASS_REQUIRED_MSG);
      return false;
    }
    if (isDonationEvent && intent === "pay") {
      const cents = parseDonationDollarsInput(donationDollars);
      if (cents == null || cents <= 0) {
        setError("Enter a donation amount greater than $0 to proceed to payment.");
        return false;
      }
    }
    if (isDonationEvent && isPaidRegistration && existingRegistration) {
      const decreaseError = validateDonationNotDecreasedAfterPayment({
        newDonationCents: parseDonationDollarsInput(donationDollars) ?? 0,
        amountPaidCents: existingRegistration.amountCents ?? 0,
        platformFeeCentsPaid: existingRegistration.platformFeeCents ?? null,
      });
      if (decreaseError) {
        setError(decreaseError);
        return false;
      }
    }
    if (saleInquiriesEnabled) {
      for (const vehicleId of registeredVehicles) {
        const listing = vehicleSaleListings[vehicleId];
        if (listing?.enabled && !listing.sellerAcknowledged) {
          setError(
            "Acknowledge the sale disclaimer for each vehicle accepting inquiries.",
          );
          return false;
        }
      }
    }
    return true;
  }

  async function handleSubmit(intent: "save" | "pay") {
    setError("");
    if (!validateBeforeSubmit(intent)) return;

    submitIntentRef.current = intent;
    if (hasMissingVehiclePhotos()) {
      setPhotoConfirmOpen(true);
      return;
    }

    await submitRegistration(intent);
  }

  async function submitRegistration(intent: "save" | "pay") {
    setError("");
    setSubmittingAction(intent);

    const vehicleIds = [...registeredVehicles];

    const catMap = Object.keys(vehicleCategories).length > 0
      ? vehicleCategories
      : undefined;

    try {
      const apiPath =
        registerApiPath ?? `/api/events/${event.id}/register`;
      const res = await fetch(apiPath, {
        method: registerMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierId,
          contact: {
            firstName: contact.firstName.trim(),
            lastName: contact.lastName.trim(),
            email: contact.email.trim(),
            phone: contact.phone.trim() || undefined,
            street: contact.street.trim(),
            city: contact.city.trim(),
            state: contact.state.trim().toUpperCase(),
            zip: contact.zip.trim(),
          },
          smsNotificationsOptIn,
          vehicleIds,
          vehicleCategories: catMap,
          vehicleNicknames: Object.fromEntries(
            vehicleIds.map((id) => [id, vehicleNicknames[id]?.trim() ?? ""]),
          ),
          vehicleStories: Object.fromEntries(
            vehicleIds.map((id) => [id, vehicleStories[id]?.trim() ?? ""]),
          ),
          vehicleVins: Object.fromEntries(
            vehicleIds.map((id) => {
              const v = allGarageVehicles.find((g) => g.id === id);
              return [id, v?.vin?.trim() ?? ""];
            }),
          ),
          ...(saleInquiriesEnabled
            ? {
                vehicleSaleListings: Object.fromEntries(
                  vehicleIds.map((id) => [
                    id,
                    vehicleSaleListingFormStateToPayload(
                      vehicleSaleListings[id] ??
                        emptyVehicleSaleListingFormState(),
                    ),
                  ]),
                ),
              }
            : {}),
          ...(isDonationEvent
            ? {
                donationCents: parseDonationDollarsInput(donationDollars) ?? 0,
              }
            : {}),
        }),
      });
      const data = (await res.json()) as {
        id?: string;
        status?: string;
        checkoutRequired?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        return;
      }

      const payAfterSave =
        !organizerEditMode &&
        intent === "pay" &&
        data.id &&
        (data.checkoutRequired ||
          (existingRegistration?.paymentStatus === "PAID" &&
            registrationBalance.amountDueCents > 0));

      if (payAfterSave) {
        const checkoutRes = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            registrationId: data.id,
            ...(isDonationEvent
              ? {
                  donationCents:
                    parseDonationDollarsInput(donationDollars) ?? 0,
                }
              : {}),
          }),
        });
        const checkoutData = (await checkoutRes.json()) as {
          checkoutUrl?: string;
          error?: string;
        };
        if (!checkoutRes.ok) {
          setError(checkoutData.error ?? "Failed to start checkout.");
          return;
        }
        if (checkoutData.checkoutUrl) {
          await redirectToStripeCheckout(checkoutData.checkoutUrl);
          return;
        }
      }

      if (afterSaveRedirectHref) {
        router.push(afterSaveRedirectHref);
        router.refresh();
        return;
      }

      router.push(
        `/events/${event.id}/register/success?status=${data.status ?? "CONFIRMED"}&tier=${encodeURIComponent(selectedTier?.name ?? "")}&count=${totalVehicles}`,
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmittingAction(null);
      setPhotoConfirmOpen(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Mobile event details — outside grid so order/placement cannot affect desktop columns */}
      <details className="mb-6 rounded-xl border bg-card p-4 lg:hidden">
        <summary className="cursor-pointer text-sm font-semibold">
          Event Details
        </summary>
        <div className="mt-3 space-y-3">
          <EventInfoSidebar event={event} />
          {isLoggedIn && (
            <ContactOrganizerButton
              eventId={event.id}
              eventLabel={`${formatEventShowNumber(event.showNumber)} ${event.name}`}
            />
          )}
        </div>
      </details>

      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* ---- LEFT COLUMN: Registration form ---- */}
        <div className="min-w-0 space-y-6" id="register">
          {isUpdating && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    {isEditRegistration
                      ? "Edit registration"
                      : "Updating your registration"}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {isEditRegistration
                      ? "Update vehicles, photos, classifications, or contact details. Removing a vehicle does not issue a refund. If you add vehicles after paying, the additional registration and convenience fees will be due."
                      : "Your registered vehicles and fees are shown below. Save your details now and pay when you are ready."}
                  </p>
                </div>
                {isLoggedIn && (
                  <ContactOrganizerButton
                    variant="icon"
                    eventId={event.id}
                    eventLabel={`${formatEventShowNumber(event.showNumber)} ${event.name}`}
                  />
                )}
              </div>
            </div>
          )}
          {/* ---- Header: Flyer + Event Name/Description ---- */}
          <div className="flex gap-4">
            {event.flyerUrl && (
              <ThumbnailWithEye onClick={() => setLightboxSrc(event.flyerUrl)}>
                <img
                  src={event.flyerUrl}
                  alt="Event flyer"
                  className="h-24 w-[4.5rem] rounded-lg border object-cover shadow-sm sm:h-[7.5rem] sm:w-[5.25rem]"
                />
              </ThumbnailWithEye>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold leading-tight">
                <EventNameWithNumber
                  name={event.name}
                  showNumber={event.showNumber}
                />
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isEditRegistration
                  ? "Edit your registration details below."
                  : canRegister
                    ? "Complete the form below to register."
                    : "Registration is not currently open for this event."}
              </p>
              {event.description && (
                <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
                  {event.description}
                </p>
              )}
            </div>
          </div>

          {canRegister && isLoggedIn && userContact && (
            <>
              <RegistrationContactSection
                contact={contact}
                onUpdate={() => setContactSheetOpen(true)}
              />
              <RegistrationContactSheet
                open={contactSheetOpen}
                onOpenChange={setContactSheetOpen}
                initialContact={contact}
                profileExtras={userContact.profileExtras}
                accountEmail={userContact.email}
                onApply={setContact}
              />
              <SmsNotificationsOptInField
                id="registration-sms-notifications-opt-in"
                checked={smsNotificationsOptIn}
                onCheckedChange={setSmsNotificationsOptIn}
                alreadyOptedInAtProfile={
                  userContact.smsNotificationsOptInDefault
                }
              />
            </>
          )}

          {/* Auth + guest registration for non-logged-in visitors */}
          {!isLoggedIn && canRegister && (
            <>
              <InlineLogin redirectPath={`/events/${event.id}`} />

              <div className="relative flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  or continue as a guest
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <GuestRegistrationForm
                eventId={event.id}
                tiers={tiers}
                feeType={event.registrationFeeType}
                feeDollars={event.registrationFeeDollars}
                stripeConnectReady={stripeConnectReady}
                platformFee={platformFee}
                platformFeeMode={event.platformFeeMode}
                platformSetupFeeCollected={event.platformSetupFeeCollected}
                eventSetupFeeCents={event.eventSetupFeeCents}
                eventCategories={registrationCategories}
                vehicleSaleInquiriesEnabled={saleInquiriesEnabled}
              />
            </>
          )}

          {!isLoggedIn && !canRegister && (
            <InlineLogin redirectPath={`/events/${event.id}`} />
          )}

          {canRegister && isLoggedIn && (
            <>
              {/* ---- Select Vehicles ---- */}
              {vehicleAddedNotice && (
                <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                  Your new vehicle was saved to My Vehicles and added to this
                  registration.
                  {requiresVehicleClass
                    ? " Assign a class and review buyer inquiry options in Registered Vehicles below, then save."
                    : " Review the list below and submit when ready."}
                </div>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">My Garage</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1.5"
                      onClick={() => setAddVehicleOpen((open) => !open)}
                    >
                      <Plus className="size-4" />
                      {addVehicleOpen ? "Hide form" : "Add New Vehicle"}
                    </Button>
                  </div>
                </CardHeader>
                  <CardContent className="space-y-4">
                    {addVehicleOpen ? (
                      <AddVehicleForm
                        onVehicleAdded={handleInlineVehicleAdded}
                        onSaved={() => setAddVehicleOpen(false)}
                      />
                    ) : null}
                    {availableGarage.length > 0 ? (
                      <>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {availableGarage.map((v) => {
                        const photoSrc = garageVehiclePhotoSrc(v.id);
                        const vinMask = garageVehicleVinMask(v.id);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setGarageActionVehicleId(v.id)}
                            className="flex w-full items-center gap-3 rounded-lg border-2 border-border px-3 py-2.5 text-left text-sm transition-all hover:border-primary/40"
                          >
                            {photoSrc ? (
                              <VehiclePhotoDisplay
                                src={photoSrc}
                                alt=""
                                size="thumb"
                                className="shrink-0"
                              />
                            ) : (
                              <div className="vehicle-photo-frame vehicle-photo-frame--thumb flex shrink-0 items-center justify-center rounded-md border border-dashed bg-muted/40">
                                <Car className="size-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium leading-snug">
                                {v.year} {v.make} {v.model}
                              </p>
                              {v.trim ? (
                                <p className="text-xs text-muted-foreground">
                                  {v.trim}
                                </p>
                              ) : null}
                              {vinMask ? (
                                <p className="font-mono text-xs text-muted-foreground">
                                  {vinMask}
                                </p>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {allGarageVehicles.length === 0
                          ? "No vehicles in your garage yet. Add one above to register for this show."
                          : "All of your garage vehicles are already in this registration."}
                      </p>
                    )}
                  </CardContent>
                </Card>

              {/* ---- Registration Table ---- */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <CardTitle className="text-base">
                        Registered Vehicles
                        {totalVehicles > 0 && (
                          <Badge variant="default" className="ml-2">
                            {totalVehicles}
                          </Badge>
                        )}
                      </CardTitle>
                      {requiresVehicleClass && missingClassVehicleIds.length > 0 ? (
                        <p className="text-xs text-destructive">
                          Select a class for each vehicle below before saving.
                        </p>
                      ) : null}
                    </div>
                    {garageVehicles.length > 0 ? (
                      <EventSectionEditToolbar
                        editing={editingRegisteredVehicles}
                        onStartEdit={() => setEditingRegisteredVehicles(true)}
                        onDone={() => {
                          setEditingRegisteredVehicles(false);
                          setSelectedRegisteredForRemoval(new Set());
                        }}
                      />
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!requiresVehicleClass && garageVehicles.length > 0 ? (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                      This event has no registration classes set up yet. Ask the
                      organizer to add registration categories before you can
                      assign a class to each vehicle.
                    </p>
                  ) : null}
                  {garageVehicles.length > 0 && (
                    <div className="space-y-3">
                      {editingRegisteredVehicles ? (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                          <input
                            type="checkbox"
                            className="size-4 rounded border-input"
                            checked={allRegisteredSelected}
                            onChange={() => {
                              if (allRegisteredSelected) {
                                setSelectedRegisteredForRemoval(new Set());
                              } else {
                                setSelectedRegisteredForRemoval(
                                  new Set(garageVehicles.map((v) => v.id)),
                                );
                              }
                            }}
                            aria-label="Select all registered vehicles"
                          />
                          {someRegisteredSelected ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 text-destructive hover:text-destructive"
                              onClick={removeSelectedFromRegistration}
                            >
                              <Trash2 className="size-3.5" />
                              Remove selected ({selectedRegisteredForRemoval.size})
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Select vehicles to remove
                            </span>
                          )}
                        </div>
                      ) : null}
                      {garageVehicles.map((v) => {
                        const saleListing = saleListingFor(v.id);
                        const saleActive =
                          saleListing.enabled &&
                          saleListing.sellerAcknowledged;
                        const canEditListingDetails =
                          saleListing.sellerAcknowledged ||
                          Boolean(saleListing.listingId);
                        return (
                          <RegisteredVehicleEditor
                            key={v.id}
                            vehicle={v}
                            photoUrl={vehiclePhotos[v.id] ?? null}
                            vinMask={garageVehicleVinMask(v.id)}
                            showId={
                              existingRegistration?.vehiclePublicIds?.[v.id] ??
                              null
                            }
                            showIdPending={
                              Boolean(isUpdating && registeredVehicles.has(v.id)) &&
                              !existingRegistration?.vehiclePublicIds?.[v.id]
                            }
                            nickname={vehicleNicknames[v.id] ?? ""}
                            story={vehicleStories[v.id] ?? ""}
                            eventCategoryId={vehicleCategories[v.id]}
                            categories={registrationCategories}
                            requiresVehicleClass={requiresVehicleClass}
                            classInvalid={missingClassVehicleIds.includes(v.id)}
                            saleInquiriesEnabled={saleInquiriesEnabled}
                            saleActive={saleActive}
                            canEditListingDetails={canEditListingDetails}
                            editingRemoval={editingRegisteredVehicles}
                            selectedForRemoval={selectedRegisteredForRemoval.has(
                              v.id,
                            )}
                            onPhotoChange={(url) =>
                              setVehiclePhotos((prev) => ({
                                ...prev,
                                [v.id]: url,
                              }))
                            }
                            onNicknameChange={(value) =>
                              setVehicleNicknames((prev) => ({
                                ...prev,
                                [v.id]: value,
                              }))
                            }
                            onStoryChange={(value) =>
                              setVehicleStories((prev) => ({
                                ...prev,
                                [v.id]: value,
                              }))
                            }
                            onCategoryChange={(categoryId) =>
                              setCategoryForVehicle(v.id, categoryId)
                            }
                            onBuyerInquiryCheck={(checked) =>
                              handleBuyerInquiryCheck(v.id, checked)
                            }
                            onEditListingDetails={() => {
                              setSaleDialogMode("edit");
                              setSaleDialogVehicleId(v.id);
                            }}
                            onToggleSelected={() =>
                              toggleRegisteredVehicleSelected(v.id)
                            }
                          />
                        );
                      })}
                    </div>
                  )}

                  {garageVehicles.length === 0 && (
                    <div className="rounded-lg border-2 border-dashed p-6 text-center">
                      <Car className="mx-auto mb-2 size-6 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        {allGarageVehicles.length > 0
                          ? "Select a vehicle from My Garage above to add it or edit its details."
                          : "Use Add New Vehicle above to add a car to your garage, then add it here."}
                      </p>
                    </div>
                  )}


                </CardContent>
              </Card>

              {/* ---- Registration Tier (only for tiered pricing) ---- */}
              {event.registrationFeeType === "PAID_TIERED" && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Registration Tier</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {singleTier ? (
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <Tag className="size-4 text-muted-foreground" />
                          <span className="font-medium">{singleTier.name}</span>
                        </div>
                        <span className="text-lg font-bold">
                          {singleTier.priceCents === 0
                            ? "Free"
                            : formatMoney(singleTier.priceCents)}
                        </span>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {tiers.map((t) => {
                          const open = isTierOpen(t);
                          const active = tierId === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              disabled={!open}
                              onClick={() => setTierId(t.id)}
                              className={cn(
                                "relative flex flex-col gap-1.5 rounded-xl border-2 p-3 text-left transition-all",
                                open && !active &&
                                  "border-border hover:border-primary/40",
                                active && "border-primary bg-primary/5",
                                !open &&
                                  "cursor-not-allowed border-border bg-muted/50 opacity-60",
                              )}
                            >
                              {active && (
                                <div className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                  <Check className="size-3" />
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{t.name}</span>
                                {t.memberOnly && (
                                  <Badge variant="secondary" className="gap-1 text-[10px]">
                                    <Users className="size-3" />
                                    Members
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xl font-bold">
                                {t.priceCents === 0
                                  ? "Free"
                                  : formatMoney(t.priceCents)}
                              </span>
                              {(t.opensAt || t.closesAt) && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Clock className="size-3 shrink-0" />
                                  {!open ? (
                                    <span>
                                      {t.opensAt &&
                                      new Date(t.opensAt) > new Date()
                                        ? `Opens ${formatDate(t.opensAt)}`
                                        : "Closed"}
                                    </span>
                                  ) : (
                                    <span>
                                      {t.closesAt
                                        ? `Closes ${formatDate(t.closesAt)}`
                                        : "Open now"}
                                    </span>
                                  )}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ---- Review & Submit ---- */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {isEditRegistration
                      ? "Review & save"
                      : "Review & Submit"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {totalVehicles > 0 && (
                    <ul className="space-y-1 text-sm">
                      {garageVehicles.map((v) => (
                        <li key={v.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          {!vehiclePhotos[v.id] ? (
                            <Car className="size-3.5 shrink-0 text-muted-foreground" />
                          ) : null}
                          <span>
                            {v.year} {v.make} {v.model}
                            {v.trim ? (
                              <span className="text-muted-foreground">
                                {" "}
                                {v.trim}
                              </span>
                            ) : null}
                          </span>
                          {existingRegistration?.vehiclePublicIds?.[v.id] ? (
                            <span className="text-muted-foreground">
                              ·{" "}
                              <span className="font-mono font-medium text-foreground">
                                {existingRegistration.vehiclePublicIds[v.id]}
                              </span>
                            </span>
                          ) : null}
                          {requiresVehicleClass ? (
                            <span className="text-muted-foreground">
                              · Class:{" "}
                              <span
                                className={cn(
                                  "font-medium text-foreground",
                                  !vehicleCategories[v.id] && "text-destructive",
                                )}
                              >
                                {vehicleClassLabel(v.id)}
                              </span>
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Fee summary */}
                  {isDonationEvent ? (
                    <div className="space-y-3 text-sm">
                      <DonationAmountField
                        value={donationDollars}
                        onChange={setDonationDollars}
                        suggestedPerVehicleDollars={suggestedPerVehicleDollars}
                        vehicleCount={totalVehicles}
                        disabled={!!submittingAction}
                        id="review-donation-amount"
                      />
                      {feeSummary.totalConvFee > 0 && (
                        <RegistrationFeeRow
                          label="Registration fee:"
                          className="border-t pt-2"
                        >
                          {formatMoney(feeSummary.convFeeCents)} ×{" "}
                          {totalVehicles} vehicle
                          {totalVehicles !== 1 ? "s" : ""} ={" "}
                          {formatMoney(feeSummary.totalConvFee)}
                        </RegistrationFeeRow>
                      )}
                      {feeSummary.flatSetupFeeCents > 0 && (
                        <RegistrationFeeRow
                          label="Platform setup fee:"
                          className="border-t pt-2"
                        >
                          {formatMoney(feeSummary.flatSetupFeeCents)}
                        </RegistrationFeeRow>
                      )}
                      {(feeSummary.regTotal > 0 ||
                        feeSummary.totalConvFee > 0 ||
                        feeSummary.flatSetupFeeCents > 0) && (
                        <RegistrationFeeRow label="Total:" bold>
                          {formatMoney(feeSummary.grandTotal)}
                        </RegistrationFeeRow>
                      )}
                      {feeSummary.regTotal === 0 &&
                        feeSummary.totalConvFee === 0 &&
                        feeSummary.flatSetupFeeCents === 0 && (
                          <p className="text-muted-foreground">
                            Enter a donation amount to see your total. You can save
                            your registration without paying.
                          </p>
                        )}
                    </div>
                  ) : (
                  (() => {
                    const {
                      unitCents,
                      regTotal,
                      convFeeCents,
                      totalConvFee,
                      flatSetupFeeCents,
                      grandTotal,
                      tierLabel,
                    } = feeSummary;

                    if (
                      regTotal === 0 &&
                      totalConvFee === 0 &&
                      flatSetupFeeCents === 0
                    ) {
                      return (
                        <div className="flex items-center gap-2 text-sm">
                          <CreditCard className="size-4 text-muted-foreground" />
                          <span className="font-medium">Free</span>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-1 text-sm">
                        {regTotal > 0 && (
                          <RegistrationFeeRow label={`${tierLabel}:`}>
                            {formatMoney(unitCents)} × {totalVehicles} vehicle
                            {totalVehicles !== 1 ? "s" : ""} ={" "}
                            {formatMoney(regTotal)}
                          </RegistrationFeeRow>
                        )}
                        {totalConvFee > 0 && (
                          <RegistrationFeeRow label="Registration fee:">
                            {formatMoney(convFeeCents)} × {totalVehicles} vehicle
                            {totalVehicles !== 1 ? "s" : ""} ={" "}
                            {formatMoney(totalConvFee)}
                          </RegistrationFeeRow>
                        )}
                        {flatSetupFeeCents > 0 && (
                          <RegistrationFeeRow label="Platform setup fee:">
                            {formatMoney(flatSetupFeeCents)}
                          </RegistrationFeeRow>
                        )}
                        {(totalConvFee > 0 ||
                          flatSetupFeeCents > 0 ||
                          regTotal > 0) && (
                          <RegistrationFeeRow label="Total:" bold>
                            {formatMoney(grandTotal)}
                          </RegistrationFeeRow>
                        )}
                      </div>
                    );
                  })()
                  )}

                  {tierPriceWillChangeAtPayment && pricingTier && selectedTier && (
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      {selectedTier.name} has ended. Payment will use the{" "}
                      <span className="font-medium">{pricingTier.name}</span> tier
                      ({formatMoney(pricingTier.priceCents)} per vehicle) in effect
                      when you pay.
                    </p>
                  )}

                  {(registrationBalance.amountPaidCents > 0 ||
                    registrationBalance.amountDueCents > 0) && (
                    <div className="space-y-1 border-t pt-2 text-sm">
                      <RegistrationFeeRow label="Amount paid" labelMuted>
                        {formatMoney(registrationBalance.amountPaidCents)}
                      </RegistrationFeeRow>
                      <RegistrationFeeRow
                        label={
                          showEditRegistrationPayOptions
                            ? "Additional amount due"
                            : "Amount due"
                        }
                        labelMuted
                      >
                        <span
                          className={cn(
                            registrationBalance.amountDueCents > 0 &&
                              "text-amber-700 dark:text-amber-300",
                          )}
                        >
                          {formatMoney(registrationBalance.amountDueCents)}
                        </span>
                      </RegistrationFeeRow>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  {(showMakePaymentButton || showEditRegistrationPayOptions) && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      You will be redirected to Stripe to complete payment.
                    </p>
                  )}

                  <div
                    className={cn(
                      "flex flex-col gap-3",
                      isUpdating && existingRegistration?.id
                        ? "sm:flex-row sm:items-start sm:justify-between"
                        : "sm:flex-row sm:justify-end",
                    )}
                  >
                    {isUpdating &&
                      existingRegistration?.id &&
                      !organizerEditMode && (
                      <div className="flex shrink-0 justify-start">
                        <CancelRegistrationButton
                          registrationId={existingRegistration.id}
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                      <Button
                        type="button"
                        size="lg"
                        variant={
                          showMakePaymentButton || showEditRegistrationPayOptions
                            ? "outline"
                            : "default"
                        }
                        className="gap-2 sm:min-w-[12rem]"
                        disabled={
                          !!submittingAction || !tierId || !canSubmitRegistration
                        }
                        onClick={() => void handleSubmit("save")}
                      >
                        {submittingAction === "save" && (
                          <Loader2 className="size-4 animate-spin" />
                        )}
                        {showEditRegistrationPayOptions
                          ? "Update Registration & Pay Later"
                          : "Save Registration Details"}
                      </Button>

                      {showMakePaymentButton && !organizerEditMode && (
                        <Button
                          type="button"
                          size="lg"
                          className="gap-2 sm:min-w-[10rem]"
                          disabled={
                            !!submittingAction || !tierId || !canSubmitRegistration
                          }
                          onClick={() => void handleSubmit("pay")}
                        >
                          {submittingAction === "pay" && (
                            <Loader2 className="size-4 animate-spin" />
                          )}
                          Make Payment
                        </Button>
                      )}

                      {showEditRegistrationPayOptions && (
                        <Button
                          type="button"
                          size="lg"
                          className="gap-2 sm:min-w-[12rem]"
                          disabled={
                            !!submittingAction || !tierId || !canSubmitRegistration
                          }
                          onClick={() => void handleSubmit("pay")}
                        >
                          {submittingAction === "pay" && (
                            <Loader2 className="size-4 animate-spin" />
                          )}
                          Update Registration and Pay Now
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {saleDialogVehicleId ? (
                <VehicleSaleListingDialog
                  open
                  mode={saleDialogMode}
                  onOpenChange={handleSaleDialogOpenChange}
                  eventId={event.id}
                  vehicleLabel={(() => {
                    const v = allGarageVehicles.find(
                      (g) => g.id === saleDialogVehicleId,
                    );
                    return v
                      ? `${v.year} ${v.make} ${v.model}`
                      : "Vehicle";
                  })()}
                  value={saleListingFor(saleDialogVehicleId)}
                  onChange={(next) =>
                    updateSaleListing(saleDialogVehicleId, next)
                  }
                  onSave={(saved) =>
                    persistSaleListingFromDialog(saleDialogVehicleId, saved)
                  }
                  profileSmsOptInActive={
                    userContact?.smsNotificationsOptInDefault ?? false
                  }
                  showSmsOptIn={isLoggedIn}
                  smsNotificationsOptIn={smsNotificationsOptIn}
                  onSmsNotificationsOptInChange={setSmsNotificationsOptIn}
                  contactPhone={contact.phone}
                />
              ) : null}

              {garageActionVehicleId ? (() => {
                const actionVehicle = allGarageVehicles.find(
                  (v) => v.id === garageActionVehicleId,
                );
                if (!actionVehicle) return null;
                return (
                  <GarageVehicleActionDialog
                    open
                    onOpenChange={(open) => {
                      if (!open) setGarageActionVehicleId(null);
                    }}
                    vehicle={actionVehicle}
                    photoSrc={garageVehiclePhotoSrc(actionVehicle.id)}
                    onAddToRegistration={() =>
                      addVehicleToRegistration(actionVehicle.id)
                    }
                    onVehicleUpdated={handleGarageVehicleUpdated}
                  />
                );
              })() : null}
            </>
          )}

          {!canRegister && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  {tiers.length === 0
                    ? "The organizer hasn't set up registration tiers for this event yet."
                    : "Registration is not currently open for this event."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ---- RIGHT COLUMN: Sticky sidebar ---- */}
        <aside className="hidden min-w-0 lg:block">
          <div className="sticky top-4 space-y-3">
            <div className="rounded-xl border bg-card p-5">
              <EventInfoSidebar event={event} />
            </div>
            {isLoggedIn && (
              <ContactOrganizerButton
                eventId={event.id}
                eventLabel={`${formatEventShowNumber(event.showNumber)} ${event.name}`}
              />
            )}
          </div>
        </aside>
      </div>

      {photoConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="photo-confirm-title"
        >
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-lg">
            <p id="photo-confirm-title" className="text-sm leading-relaxed">
              Do you want to register for this car show without uploading a vehicle
              photo?
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!!submittingAction}
                onClick={() => setPhotoConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!!submittingAction}
                onClick={() => void submitRegistration(submitIntentRef.current)}
              >
                {submittingAction && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Continue without photo
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt="Event flyer"
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </div>
  );
}
