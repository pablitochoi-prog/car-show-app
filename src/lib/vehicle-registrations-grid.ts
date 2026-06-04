import { prisma } from "@/lib/db";
import { registrationVehicleStaffPhotoViewPath } from "@/lib/event-registration-staff-photos";
import { resolveRegistrationContact } from "@/lib/registration-contact";
import type {
  VehicleRegistrationsCategoryColumn,
  VehicleRegistrationsGrid,
  VehicleRegistrationsGridRow,
  VehicleRegistrationsVehicleClass,
} from "@/lib/vehicle-registrations-grid-types";

export type {
  VehicleRegistrationsCategoryColumn,
  VehicleRegistrationsGrid,
  VehicleRegistrationsGridRow,
  VehicleRegistrationsVehicleClass,
} from "@/lib/vehicle-registrations-grid-types";
export { VEHICLE_REGISTRATIONS_UNASSIGNED_JUDGE } from "@/lib/vehicle-registrations-grid-types";

function vehicleClassLabel(
  ec: {
    customName: string | null;
    category: { name: string } | null;
  } | null,
): string | null {
  if (!ec) return null;
  return ec.customName?.trim() || ec.category?.name || "Vehicle class";
}

function resolveRowPhotoUrl(
  eventId: string,
  registrationId: string,
  registrationVehicleId: string,
  publicVehicleId: string | null,
  eventPhotoObjectKey: string | null,
  legacyPhotoUrl: string | null,
): string | null {
  if (eventPhotoObjectKey) {
    return registrationVehicleStaffPhotoViewPath(
      eventId,
      registrationId,
      registrationVehicleId,
    );
  }
  const code = publicVehicleId?.trim();
  if (code) {
    const http = legacyPhotoUrl?.trim();
    if (http?.startsWith("http")) return http;
    return `/api/v/${encodeURIComponent(code)}/photo`;
  }
  const http = legacyPhotoUrl?.trim();
  if (http?.startsWith("http")) return http;
  return null;
}

const registrationContactSelect = {
  userId: true,
  guestFirstName: true,
  guestLastName: true,
  guestEmail: true,
  guestPhone: true,
  registrantFirstName: true,
  registrantLastName: true,
  registrantEmail: true,
  registrantPhone: true,
  user: {
    select: {
      name: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  },
} as const;

/** Event uses score sheet judging when at least one registration class is mapped to a template. */
export async function eventUsesScoreSheetJudging(eventId: string): Promise<boolean> {
  const judgingClass = await prisma.eventJudgingClass.findFirst({
    where: { eventId, isActive: true },
    select: { id: true },
  });
  return judgingClass != null;
}

/** Template IDs for active judging classes — sections become grid judge columns. */
async function scorecardTemplateIdsForEvent(eventId: string): Promise<string[]> {
  const judgingClasses = await prisma.eventJudgingClass.findMany({
    where: { eventId, isActive: true },
    select: { eventJudgingTemplateId: true },
  });
  return [...new Set(judgingClasses.map((j) => j.eventJudgingTemplateId))];
}

export async function loadVehicleRegistrationsGrid(
  eventId: string,
): Promise<VehicleRegistrationsGrid> {
  const scoreSheetJudgingEnabled = await eventUsesScoreSheetJudging(eventId);
  const templateIds = scoreSheetJudgingEnabled
    ? await scorecardTemplateIdsForEvent(eventId)
    : [];

  const sectionsRaw =
    templateIds.length === 0
      ? []
      : await prisma.eventJudgingSection.findMany({
          where: { templateId: { in: templateIds }, isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true, sortOrder: true },
        });

  const categories: VehicleRegistrationsCategoryColumn[] = sectionsRaw.map(
    (s) => ({
      sectionId: s.id,
      name: s.name,
      sortOrder: s.sortOrder,
    }),
  );

  const vehicleClassesRaw = await prisma.eventCategory.findMany({
    where: { eventId },
    select: {
      id: true,
      customName: true,
      category: { select: { name: true, sortOrder: true } },
    },
    orderBy: [{ createdAt: "asc" }],
  });
  const vehicleClasses: VehicleRegistrationsVehicleClass[] = vehicleClassesRaw
    .map((c) => ({
      id: c.id,
      name: c.customName?.trim() || c.category?.name || "Vehicle class",
      sortOrder: c.category?.sortOrder ?? 0,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const vehicles = await prisma.registrationVehicle.findMany({
    where: {
      registration: { eventId, status: "CONFIRMED" },
    },
    select: {
      id: true,
      registrationId: true,
      publicVehicleId: true,
      eventCategoryId: true,
      eventPhotoObjectKey: true,
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
          vin: true,
          photoUrl: true,
        },
      },
      registration: { select: registrationContactSelect },
    },
    orderBy: [
      { publicVehicleId: "asc" },
      { vehicle: { make: "asc" } },
      { vehicle: { model: "asc" } },
    ],
  });

  const vehicleIds = vehicles.map((v) => v.id);
  const assignments =
    !scoreSheetJudgingEnabled || vehicleIds.length === 0
      ? []
      : await prisma.eventJudgeCategoryAssignment.findMany({
          where: { eventId, registrationVehicleId: { in: vehicleIds } },
          select: {
            registrationVehicleId: true,
            section: { select: { id: true } },
            judge: { select: { name: true } },
          },
        });

  const judgeByVehicle = new Map<string, Map<string, string>>();
  for (const a of assignments) {
    const bySection =
      judgeByVehicle.get(a.registrationVehicleId) ?? new Map<string, string>();
    bySection.set(a.section.id, a.judge.name);
    judgeByVehicle.set(a.registrationVehicleId, bySection);
  }

  const rows: VehicleRegistrationsGridRow[] = vehicles.map((v) => {
    const owner = resolveRegistrationContact(v.registration);
    const sectionJudges = judgeByVehicle.get(v.id);
    const judgeBySectionId: Record<string, string | null> = {};
    for (const col of categories) {
      judgeBySectionId[col.sectionId] = sectionJudges?.get(col.sectionId) ?? null;
    }
    return {
      registrationVehicleId: v.id,
      eventCategoryId: v.eventCategoryId,
      publicVehicleId: v.publicVehicleId?.trim() || null,
      photoUrl: resolveRowPhotoUrl(
        eventId,
        v.registrationId,
        v.id,
        v.publicVehicleId,
        v.eventPhotoObjectKey,
        v.vehicle.photoUrl,
      ),
      year: v.vehicle.year,
      make: v.vehicle.make,
      model: v.vehicle.model,
      vin: v.vehicle.vin,
      vehicleClass: vehicleClassLabel(v.eventCategory),
      ownerName: owner.name?.trim() || null,
      judgeBySectionId,
    };
  });

  return { scoreSheetJudgingEnabled, categories, vehicleClasses, rows };
}
