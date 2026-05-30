import { prisma } from "@/lib/db";
import { buildDashCardEventModel } from "@/lib/dash-card-event";
import { ensureVehicleQrsForEntryCodes } from "@/lib/ensure-dash-card-vehicle-qrs";
import {
  formatOwnerCityState,
  formatRegistrationMailingAddress,
} from "@/lib/registration-address";
import { resolveRegistrationContact } from "@/lib/registration-contact";
import { getPlatformSponsor } from "@/lib/platform-sponsor";
import type { DashCardModel } from "@/lib/dash-card-types";
import {
  guestVehicleStaffPhotoViewPath,
  registrationRegistrantStaffPhotoViewPath,
  registrationVehicleStaffPhotoViewPath,
  syncAllRegistrationStaffPhotos,
} from "@/lib/event-registration-staff-photos";
import { vehicleSmartRouteUrl } from "@/lib/vehicle-entry-code";
import { getSharedSmsNumberDisplay, buildDashCardSmsLine } from "@/lib/sms/shared-sms-number";
import { getSiteOrigin } from "@/lib/site-url";

type GuestVehicleJson = {
  year?: number;
  make?: string;
  model?: string;
  trim?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  eventCategoryId?: string | null;
  publicVehicleId?: string;
  nickname?: string | null;
  staffPhotoObjectKey?: string | null;
};

function appOrigin() {
  return getSiteOrigin();
}

function defaultSmsShortCode() {
  return process.env.NEXT_PUBLIC_SMS_VOTE_SHORT_CODE?.trim() || "22333";
}

function buildVotingBlock(params: {
  vehicleId: string;
  smsNumber: string;
  votingHint: string;
}): DashCardModel["voting"] {
  const { vehicleId, smsNumber, votingHint } = params;
  const displayNumber = smsNumber;
  return {
    smsShortCode: displayNumber,
    vehicleIdForSms: vehicleId,
    smsInstructionLine: vehicleId
      ? buildDashCardSmsLine(vehicleId, displayNumber)
      : "",
    ratesDisclaimer: "Standard message rates apply.",
    qrSectionTitle: "Scan to Vote or Judge",
    qrDestinationHint: votingHint,
    qrImageUrl: null,
  };
}

function categoryLabelFromMap(
  map: Map<string, string>,
  id: string | null | undefined,
): string {
  if (!id) return "Class — to be assigned";
  return map.get(id) ?? "Class — to be assigned";
}

function buildCategoryMap(
  rows: {
    id: string;
    customName: string | null;
    category: { name: string } | null;
  }[],
) {
  return new Map(
    rows.map((r) => [
      r.id,
      r.customName?.trim() || r.category?.name || "Class",
    ]),
  );
}

function ownerCityStateFromRegistration(reg: {
  registrantCity: string | null;
  registrantState: string | null;
  guestCity: string | null;
  guestState: string | null;
  user: { city: string | null; state: string | null } | null;
}): string {
  return formatOwnerCityState({
    city: reg.registrantCity ?? reg.guestCity ?? reg.user?.city,
    state: reg.registrantState ?? reg.guestState ?? reg.user?.state,
  });
}

function ownerMailingAddress(reg: {
  registrantStreet: string | null;
  registrantCity: string | null;
  registrantState: string | null;
  registrantZip: string | null;
  guestStreet: string | null;
  guestCity: string | null;
  guestState: string | null;
  guestZip: string | null;
  user: {
    street: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  } | null;
}): string {
  const fromRegistration = formatRegistrationMailingAddress({
    street: reg.registrantStreet ?? reg.guestStreet,
    city: reg.registrantCity ?? reg.guestCity,
    state: reg.registrantState ?? reg.guestState,
    zip: reg.registrantZip ?? reg.guestZip,
  });
  if (fromRegistration) return fromRegistration;
  if (!reg.user) return "";
  return formatRegistrationMailingAddress(reg.user);
}

function resolveVehiclePhotoUrl(
  eventId: string,
  registrationId: string,
  registrationVehicleId: string,
  eventPhotoObjectKey: string | null,
  legacyPhotoUrl: string | null | undefined,
): string | null {
  if (eventPhotoObjectKey) {
    return registrationVehicleStaffPhotoViewPath(
      eventId,
      registrationId,
      registrationVehicleId,
    );
  }
  const url = legacyPhotoUrl?.trim();
  if (url?.startsWith("http://") || url?.startsWith("https://")) {
    return url;
  }
  return null;
}

function resolveRegistrantPhotoUrl(
  eventId: string,
  registrationId: string,
  registrantPhotoObjectKey: string | null,
): string | null {
  if (!registrantPhotoObjectKey) return null;
  return registrationRegistrantStaffPhotoViewPath(eventId, registrationId);
}

function parseGuestVehicles(raw: unknown): GuestVehicleJson[] {
  if (Array.isArray(raw)) {
    return raw.filter(
      (item): item is GuestVehicleJson =>
        item != null && typeof item === "object",
    );
  }
  if (raw && typeof raw === "object") {
    const o = raw as GuestVehicleJson;
    if (
      typeof o.year === "number" ||
      typeof o.make === "string" ||
      typeof o.model === "string"
    ) {
      return [o];
    }
  }
  return [];
}

function placeholderCardForRegistration(
  eventBlock: DashCardModel["event"],
  siteSponsor: DashCardModel["siteSponsor"],
  ownerName: string,
  ownerCityState: string,
  eventId: string,
  smsNumber: string,
  origin: string,
): DashCardModel {
  return {
    event: eventBlock,
    siteSponsor,
    vehicle: {
      publicVehicleId: null,
      year: 0,
      make: "Vehicle",
      model: "pending",
      trim: null,
      nickname: null,
      classLabel: "Class — to be assigned",
      vehiclePhotoUrl: null,
    },
    owner: {
      name: ownerName,
      cityState: ownerCityState || "—",
    },
    vehicleStory:
      "No vehicles on this registration yet. Add vehicles before printing dash cards.",
    voting: buildVotingBlock({
      vehicleId: "",
      smsNumber,
      votingHint: `${origin.replace(/\/$/, "")}/events/${eventId}`,
    }),
  };
}

/**
 * Loads printable dash cards for organizer bulk print: one card per linked vehicle
 * (`RegistrationVehicle`) and one per guest JSON vehicle when there are no linked rows.
 * TODO: Replace hard-coded SMS short code with per-event `Event` config when added to schema.
 */
export async function loadDashCardModelsForRegistrations(
  eventId: string,
  registrationIds: string[],
): Promise<DashCardModel[]> {
  const uniqueRegIds = [...new Set(registrationIds.filter(Boolean))];
  if (uniqueRegIds.length === 0) return [];

  // Ensure staff snapshots exist for private garage / profile photos used on dash cards.
  await Promise.all(
    uniqueRegIds.map(async (registrationId) => {
      try {
        await syncAllRegistrationStaffPhotos(registrationId);
      } catch (e) {
        console.error("dash card staff photo sync:", registrationId, e);
      }
    }),
  );

  const [event, categoryRows, smsNumber, platformSponsor] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        venue: true,
        street: true,
        city: true,
        state: true,
        startTime: true,
        endTime: true,
        logoUrl: true,
        sponsorLogoUrl: true,
        sponsorWebsite: true,
        sponsorName: true,
        organization: { select: { name: true, logo: true } },
      },
    }),
    prisma.eventCategory.findMany({
      where: { eventId },
      select: {
        id: true,
        customName: true,
        category: { select: { name: true } },
      },
    }),
    getSharedSmsNumberDisplay(),
    getPlatformSponsor(),
  ]);

  if (!event) return [];

  const categoryLabelById = buildCategoryMap(categoryRows);
  const eventBlock = buildDashCardEventModel(event);
  const siteSponsor = {
    logoUrl: platformSponsor.logoUrl,
    websiteUrl: platformSponsor.website,
    name: platformSponsor.name,
  };

  const registrations = await prisma.registration.findMany({
    where: { eventId, id: { in: uniqueRegIds } },
    select: {
      id: true,
      guestVehicles: true,
      guestFirstName: true,
      guestLastName: true,
      guestEmail: true,
      guestPhone: true,
      guestStreet: true,
      guestCity: true,
      guestState: true,
      guestZip: true,
      registrantFirstName: true,
      registrantLastName: true,
      registrantEmail: true,
      registrantPhone: true,
      registrantStreet: true,
      registrantCity: true,
      registrantState: true,
      registrantZip: true,
      registrantPhotoObjectKey: true,
      vehicles: {
        include: {
          vehicle: true,
          eventCategory: {
            include: { category: { select: { name: true } } },
          },
        },
        orderBy: [{ displayNumber: "asc" }, { id: "asc" }],
      },
      user: {
        select: {
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          street: true,
          city: true,
          state: true,
          zip: true,
        },
      },
    },
  });

  const regById = new Map(registrations.map((r) => [r.id, r]));
  const displaySmsNumber = smsNumber || defaultSmsShortCode();
  const origin = appOrigin();
  /** Stable ordering follows the checkbox / URL order. */
  const ordered = uniqueRegIds
    .map((id) => regById.get(id))
    .filter((r): r is NonNullable<typeof r> => !!r);

  const cards: DashCardModel[] = [];

  for (const reg of ordered) {
    const resolved = resolveRegistrationContact(reg);
    const ownerName = resolved.name;
    const ownerCityState = ownerCityStateFromRegistration(reg);
    const ownerPhotoUrl = resolveRegistrantPhotoUrl(
      eventId,
      reg.id,
      reg.registrantPhotoObjectKey,
    );

    for (const rv of reg.vehicles) {
      const v = rv.vehicle;
      const classLabel =
        rv.eventCategory != null
          ? categoryLabelById.get(rv.eventCategory.id) ?? "Class"
          : "Class — to be assigned";

      const pid = rv.publicVehicleId;
      const votingHint = pid
        ? vehicleSmartRouteUrl(pid)
        : `${origin.replace(/\/$/, "")}/events/${eventId}`;

      const vehiclePhotoUrl = resolveVehiclePhotoUrl(
        eventId,
        reg.id,
        rv.id,
        rv.eventPhotoObjectKey,
        v.photoUrl,
      );

      cards.push({
        event: eventBlock,
        siteSponsor,
        vehicle: {
          publicVehicleId: pid,
          year: v.year,
          make: v.make,
          model: v.model,
          trim: v.trim,
          nickname: v.nickname,
          classLabel,
          vehiclePhotoUrl,
        },
        owner: {
          name: ownerName,
          cityState: ownerCityState,
          ownerPhotoUrl,
        },
        vehicleStory:
          (v.notes?.trim() || "").length > 0
            ? v.notes!.trim()
            : "Vehicle notes will appear here when the owner adds them to their garage entry.",
        voting: buildVotingBlock({
          vehicleId: pid ?? "",
          smsNumber: displaySmsNumber,
          votingHint,
        }),
      });
    }

    if (reg.vehicles.length === 0) {
      const guestList = parseGuestVehicles(reg.guestVehicles);

      for (const gv of guestList) {
        const classLabel = categoryLabelFromMap(
          categoryLabelById,
          gv.eventCategoryId,
        );
        const pid = gv.publicVehicleId?.trim() || null;
        const votingHint = pid
          ? vehicleSmartRouteUrl(pid)
          : `${origin.replace(/\/$/, "")}/events/${eventId}`;

        const vehiclePhotoUrl =
          gv.staffPhotoObjectKey && pid
            ? guestVehicleStaffPhotoViewPath(eventId, reg.id, pid)
            : gv.photoUrl?.trim().startsWith("http")
              ? gv.photoUrl.trim()
              : null;

        cards.push({
          event: eventBlock,
          siteSponsor,
          vehicle: {
            publicVehicleId: pid,
            year: gv.year ?? 0,
            make: (gv.make ?? "").trim() || "Vehicle",
            model: (gv.model ?? "").trim() || "",
            trim: gv.trim,
            nickname: gv.nickname?.trim() || null,
            classLabel,
            vehiclePhotoUrl,
          },
          owner: {
            name: ownerName,
            cityState: ownerCityState,
            ownerPhotoUrl: null,
          },
          vehicleStory:
            (gv.notes?.trim() || "").length > 0
              ? gv.notes!.trim()
              : "Vehicle details for this registration.",
          voting: buildVotingBlock({
            vehicleId: pid ?? "",
            smsNumber: displaySmsNumber,
            votingHint,
          }),
        });
      }

      if (guestList.length === 0) {
        cards.push(
          placeholderCardForRegistration(
            eventBlock,
            siteSponsor,
            ownerName,
            ownerCityState,
            eventId,
            displaySmsNumber,
            origin,
          ),
        );
      }
    }
  }

  const codes = cards
    .map((c) => c.vehicle.publicVehicleId)
    .filter((id): id is string => !!id?.trim());
  const qrByCode = await ensureVehicleQrsForEntryCodes(codes);

  for (const card of cards) {
    const pid = card.vehicle.publicVehicleId;
    if (pid && qrByCode.has(pid)) {
      card.voting.qrImageUrl = qrByCode.get(pid)!;
    }
  }

  return cards;
}
