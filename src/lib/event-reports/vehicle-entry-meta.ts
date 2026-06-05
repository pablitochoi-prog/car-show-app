import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { GuestVehicleRecord } from "@/lib/event-sms-vehicle-id";
import { resolveRegistrationContact } from "@/lib/registration-contact";

export type VehicleEntryMeta = {
  vehicleEntryCode: string;
  ownerName: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  vehicleClass: string;
  vehicleNickname: string | null;
  city: string | null;
  state: string | null;
};

function categoryLabel(
  ec: {
    customName: string | null;
    category: { name: string } | null;
  } | null,
): string {
  if (!ec) return "—";
  return ec.customName?.trim() || ec.category?.name || "—";
}

/** Load display metadata keyed by public vehicle entry code for an event. */
export async function loadVehicleEntryMetaMap(
  eventId: string,
): Promise<Map<string, VehicleEntryMeta>> {
  const map = new Map<string, VehicleEntryMeta>();

  const registrations = await prisma.registration.findMany({
    where: { eventId },
    select: {
      id: true,
      guestVehicles: true,
      registrantCity: true,
      registrantState: true,
      guestCity: true,
      guestState: true,
      user: {
        select: {
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
        },
      },
      guestFirstName: true,
      guestLastName: true,
      guestEmail: true,
      guestPhone: true,
      registrantFirstName: true,
      registrantLastName: true,
      registrantEmail: true,
      registrantPhone: true,
      vehicles: {
        select: {
          publicVehicleId: true,
          vehicleNickname: true,
          eventCategory: {
            select: {
              customName: true,
              category: { select: { name: true } },
            },
          },
          vehicle: {
            select: {
              year: true,
              make: true,
              model: true,
              trim: true,
              nickname: true,
            },
          },
        },
      },
    },
  });

  for (const reg of registrations) {
    const contact = resolveRegistrationContact(reg);
    const ownerName = contact.name?.trim() || null;
    const city = reg.registrantCity?.trim() || reg.guestCity?.trim() || null;
    const state = reg.registrantState?.trim() || reg.guestState?.trim() || null;

    for (const rv of reg.vehicles) {
      const code = rv.publicVehicleId?.trim();
      if (!code) continue;
      map.set(code, {
        vehicleEntryCode: code,
        ownerName,
        year: rv.vehicle.year,
        make: rv.vehicle.make,
        model: rv.vehicle.model,
        trim: rv.vehicle.trim,
        vehicleClass: categoryLabel(rv.eventCategory),
        vehicleNickname:
          rv.vehicleNickname?.trim() || rv.vehicle.nickname?.trim() || null,
        city,
        state,
      });
    }

    const guestList = Array.isArray(reg.guestVehicles)
      ? (reg.guestVehicles as GuestVehicleRecord[])
      : [];
    for (const gv of guestList) {
      const code = gv.publicVehicleId?.trim();
      if (!code || map.has(code)) continue;
      map.set(code, {
        vehicleEntryCode: code,
        ownerName,
        year: typeof gv.year === "number" ? gv.year : 0,
        make: typeof gv.make === "string" ? gv.make : "—",
        model: typeof gv.model === "string" ? gv.model : "—",
        trim: typeof gv.trim === "string" ? gv.trim : null,
        vehicleClass: "—",
        vehicleNickname:
          typeof gv.nickname === "string" ? gv.nickname.trim() || null : null,
        city,
        state,
      });
    }
  }

  return map;
}
