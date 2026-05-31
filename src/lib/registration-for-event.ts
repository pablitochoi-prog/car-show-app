import { prisma } from "@/lib/db";
import type { RegistrationContact } from "@/lib/registration-contact";
import type { ExistingRegistrationForEvent } from "@/lib/registration-for-event-types";
import { loadVehicleSaleListingsByVehicleId } from "@/lib/vehicle-sale-listings-for-registration";

export type { ExistingRegistrationForEvent } from "@/lib/registration-for-event-types";

export async function getExistingRegistrationForEvent(
  eventId: string,
  userId: string,
): Promise<ExistingRegistrationForEvent | null> {
  const row = await prisma.registration.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      amountCents: true,
      platformFeeCents: true,
      refundedCents: true,
      tierId: true,
      registrantFirstName: true,
      registrantLastName: true,
      registrantEmail: true,
      registrantPhone: true,
      registrantStreet: true,
      registrantCity: true,
      registrantState: true,
      registrantZip: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          street: true,
          city: true,
          state: true,
          zip: true,
        },
      },
      vehicles: {
        select: {
          vehicleId: true,
          eventCategoryId: true,
          publicVehicleId: true,
        },
      },
    },
  });

  if (!row || row.status === "CANCELLED") return null;

  const vehicleCategories: Record<string, string> = {};
  const vehiclePublicIds: Record<string, string> = {};
  for (const rv of row.vehicles) {
    if (rv.eventCategoryId) {
      vehicleCategories[rv.vehicleId] = rv.eventCategoryId;
    }
    if (rv.publicVehicleId) {
      vehiclePublicIds[rv.vehicleId] = rv.publicVehicleId;
    }
  }

  const contact: RegistrationContact = {
    firstName:
      row.registrantFirstName?.trim() ||
      row.user?.firstName?.trim() ||
      "",
    lastName:
      row.registrantLastName?.trim() ||
      row.user?.lastName?.trim() ||
      "",
    email:
      row.registrantEmail?.trim() ||
      row.user?.email?.trim() ||
      "",
    phone:
      row.user?.phone?.trim() ||
      row.registrantPhone?.trim() ||
      "",
    street:
      row.registrantStreet?.trim() || row.user?.street?.trim() || "",
    city: row.registrantCity?.trim() || row.user?.city?.trim() || "",
    state: row.registrantState?.trim() || row.user?.state?.trim() || "",
    zip: row.registrantZip?.trim() || row.user?.zip?.trim() || "",
  };

  return {
    id: row.id,
    tierId: row.tierId,
    vehicleIds: row.vehicles.map((v) => v.vehicleId),
    vehicleCategories,
    vehiclePublicIds,
    contact,
    paymentStatus: row.paymentStatus,
    registrationStatus: row.status,
    amountCents: row.amountCents,
    platformFeeCents: row.platformFeeCents,
    refundedCents: row.refundedCents,
    vehicleSaleListings: await loadVehicleSaleListingsByVehicleId(row.id),
  };
}

/** Load a registration by id for organizer edit (member or guest). */
export async function getRegistrationByIdForOrganizer(
  eventId: string,
  registrationId: string,
): Promise<
  | (ExistingRegistrationForEvent & {
      userId: string | null;
      guestVehicles: unknown;
    })
  | null
> {
  const row = await prisma.registration.findFirst({
    where: { id: registrationId, eventId },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      amountCents: true,
      platformFeeCents: true,
      refundedCents: true,
      tierId: true,
      userId: true,
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
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          street: true,
          city: true,
          state: true,
          zip: true,
        },
      },
      vehicles: {
        select: {
          vehicleId: true,
          eventCategoryId: true,
          publicVehicleId: true,
        },
      },
    },
  });

  if (!row) return null;

  const vehicleCategories: Record<string, string> = {};
  const vehiclePublicIds: Record<string, string> = {};
  for (const rv of row.vehicles) {
    if (rv.eventCategoryId) {
      vehicleCategories[rv.vehicleId] = rv.eventCategoryId;
    }
    if (rv.publicVehicleId) {
      vehiclePublicIds[rv.vehicleId] = rv.publicVehicleId;
    }
  }

  const contact: RegistrationContact = {
    firstName:
      row.registrantFirstName?.trim() ||
      row.guestFirstName?.trim() ||
      row.user?.firstName?.trim() ||
      "",
    lastName:
      row.registrantLastName?.trim() ||
      row.guestLastName?.trim() ||
      row.user?.lastName?.trim() ||
      "",
    email:
      row.registrantEmail?.trim() ||
      row.guestEmail?.trim() ||
      row.user?.email?.trim() ||
      "",
    phone:
      row.user?.phone?.trim() ||
      row.registrantPhone?.trim() ||
      row.guestPhone?.trim() ||
      "",
    street:
      row.registrantStreet?.trim() ||
      row.guestStreet?.trim() ||
      row.user?.street?.trim() ||
      "",
    city:
      row.registrantCity?.trim() ||
      row.guestCity?.trim() ||
      row.user?.city?.trim() ||
      "",
    state:
      row.registrantState?.trim() ||
      row.guestState?.trim() ||
      row.user?.state?.trim() ||
      "",
    zip:
      row.registrantZip?.trim() ||
      row.guestZip?.trim() ||
      row.user?.zip?.trim() ||
      "",
  };

  return {
    id: row.id,
    userId: row.userId,
    guestVehicles: row.guestVehicles,
    tierId: row.tierId,
    vehicleIds: row.vehicles.map((v) => v.vehicleId),
    vehicleCategories,
    vehiclePublicIds,
    contact,
    paymentStatus: row.paymentStatus,
    registrationStatus: row.status,
    amountCents: row.amountCents,
    platformFeeCents: row.platformFeeCents,
    refundedCents: row.refundedCents,
    vehicleSaleListings: row.userId
      ? await loadVehicleSaleListingsByVehicleId(row.id)
      : undefined,
  };
}
