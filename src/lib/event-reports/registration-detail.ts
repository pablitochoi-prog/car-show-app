import { prisma } from "@/lib/db";
import type { GuestVehicleRecord } from "@/lib/event-sms-vehicle-id";
import { resolveRegistrationContact } from "@/lib/registration-contact";
import { csvRow } from "@/lib/event-reports/csv";
import { formatCents } from "@/lib/event-reports/format";

export type RegistrationDetailRow = {
  registrationId: string;
  registeredAt: string;
  registrantName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  zip: string;
  vehicleEntryCode: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  vehicleClass: string;
  tierName: string;
  registrationStatus: string;
  paymentStatus: string;
  amountPaid: string;
  smsOptIn: string;
  dashCardReady: string;
  vehicleNickname: string;
  vehicleStory: string;
  openToBuyerInquiries: string;
};

export type RegistrationDetailReport = {
  generatedAt: string;
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
  search: string;
  rows: RegistrationDetailRow[];
};

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function categoryLabel(
  ec: {
    customName: string | null;
    category: { name: string } | null;
  } | null,
): string {
  if (!ec) return "";
  return ec.customName?.trim() || ec.category?.name || "";
}

function flattenRegistration(
  reg: {
    id: string;
    status: string;
    createdAt: Date;
    paymentStatus: string | null;
    amountCents: number | null;
    smsNotificationsOptIn: boolean;
    registrantCity: string | null;
    registrantState: string | null;
    registrantZip: string | null;
    guestCity: string | null;
    guestState: string | null;
    guestZip: string | null;
    guestVehicles: unknown;
    tier: { name: string };
    user: {
      name: string;
      email: string;
      phone: string | null;
      firstName: string | null;
      lastName: string | null;
      status?: string | null;
    } | null;
    guestFirstName: string | null;
    guestLastName: string | null;
    guestEmail: string | null;
    guestPhone: string | null;
    registrantFirstName: string | null;
    registrantLastName: string | null;
    registrantEmail: string | null;
    registrantPhone: string | null;
    vehicles: Array<{
      publicVehicleId: string | null;
      vehicleNickname: string | null;
      vehicleStory: string | null;
      vehicleQrUrl: string | null;
      eventCategory: {
        customName: string | null;
        category: { name: string } | null;
      } | null;
      vehicle: {
        year: number;
        make: string;
        model: string;
        trim: string | null;
      };
      saleListing: { enabled: boolean } | null;
    }>;
  },
): RegistrationDetailRow[] {
  const contact = resolveRegistrationContact(reg);
  const city = reg.registrantCity?.trim() || reg.guestCity?.trim() || "";
  const state = reg.registrantState?.trim() || reg.guestState?.trim() || "";
  const zip = reg.registrantZip?.trim() || reg.guestZip?.trim() || "";
  const base = {
    registrationId: reg.id,
    registeredAt: reg.createdAt.toISOString(),
    registrantName: contact.name,
    email: contact.email,
    phone: contact.phone,
    city,
    state,
    zip,
    tierName: reg.tier.name,
    registrationStatus: reg.status,
    paymentStatus: reg.paymentStatus ?? "—",
    amountPaid: formatCents(reg.amountCents),
    smsOptIn: reg.smsNotificationsOptIn ? "Yes" : "No",
  };

  const rows: RegistrationDetailRow[] = [];

  for (const rv of reg.vehicles) {
    rows.push({
      ...base,
      vehicleEntryCode: rv.publicVehicleId?.trim() ?? "",
      year: String(rv.vehicle.year),
      make: rv.vehicle.make,
      model: rv.vehicle.model,
      trim: rv.vehicle.trim ?? "",
      vehicleClass: categoryLabel(rv.eventCategory),
      dashCardReady: rv.vehicleQrUrl ? "QR ready" : "—",
      vehicleNickname: rv.vehicleNickname?.trim() ?? "",
      vehicleStory: rv.vehicleStory?.trim() ?? "",
      openToBuyerInquiries: rv.saleListing?.enabled ? "Yes" : "No",
    });
  }

  const guestList = Array.isArray(reg.guestVehicles)
    ? (reg.guestVehicles as GuestVehicleRecord[])
    : [];
  for (const gv of guestList) {
    rows.push({
      ...base,
      vehicleEntryCode: gv.publicVehicleId?.trim() ?? "",
      year: gv.year != null ? String(gv.year) : "",
      make: gv.make ?? "",
      model: gv.model ?? "",
      trim: gv.trim ?? "",
      vehicleClass: "",
      dashCardReady: "—",
      vehicleNickname: gv.nickname?.trim() ?? "",
      vehicleStory: typeof gv.notes === "string" ? gv.notes : "",
      openToBuyerInquiries: "—",
    });
  }

  if (rows.length === 0) {
    rows.push({
      ...base,
      vehicleEntryCode: "",
      year: "",
      make: "",
      model: "",
      trim: "",
      vehicleClass: "",
      dashCardReady: "—",
      vehicleNickname: "",
      vehicleStory: "",
      openToBuyerInquiries: "—",
    });
  }

  return rows;
}

const registrationSelect = {
  id: true,
  status: true,
  createdAt: true,
  paymentStatus: true,
  amountCents: true,
  smsNotificationsOptIn: true,
  registrantCity: true,
  registrantState: true,
  registrantZip: true,
  guestCity: true,
  guestState: true,
  guestZip: true,
  guestVehicles: true,
  tier: { select: { name: true } },
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
      vehicleStory: true,
      vehicleQrUrl: true,
      eventCategory: {
        select: {
          customName: true,
          category: { select: { name: true } },
        },
      },
      vehicle: {
        select: { year: true, make: true, model: true, trim: true },
      },
      saleListing: { select: { enabled: true } },
    },
  },
} as const;

export async function loadAllRegistrationDetailRows(
  eventId: string,
): Promise<RegistrationDetailRow[]> {
  const registrations = await prisma.registration.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    select: registrationSelect,
  });
  return registrations.flatMap(flattenRegistration);
}

export async function loadRegistrationDetailReport(
  eventId: string,
  options?: { search?: string; page?: number; pageSize?: number },
): Promise<RegistrationDetailReport> {
  const search = options?.search?.trim().toLowerCase() ?? "";
  const pageSize = Math.min(
    Math.max(options?.pageSize ?? DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );
  const page = Math.max(options?.page ?? 1, 1);

  let rows = await loadAllRegistrationDetailRows(eventId);

  if (search) {
    rows = rows.filter((row) => {
      const hay = [
        row.registrantName,
        row.email,
        row.phone,
        row.vehicleEntryCode,
        row.make,
        row.model,
        row.vehicleClass,
        row.tierName,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(search);
    });
  }

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    generatedAt: new Date().toISOString(),
    totalRows,
    page: safePage,
    pageSize,
    totalPages,
    search: options?.search?.trim() ?? "",
    rows: rows.slice(start, start + pageSize),
  };
}

export function buildRegistrationDetailCsv(rows: RegistrationDetailRow[]): string {
  const header = [
    "registration_id",
    "registered_at",
    "registrant_name",
    "email",
    "phone",
    "city",
    "state",
    "zip",
    "vehicle_entry_code",
    "year",
    "make",
    "model",
    "trim",
    "vehicle_class",
    "tier",
    "registration_status",
    "payment_status",
    "amount_paid",
    "sms_opt_in",
    "dash_card",
    "vehicle_nickname",
    "vehicle_story",
    "open_to_buyer_inquiries",
  ];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      csvRow([
        r.registrationId,
        r.registeredAt,
        r.registrantName,
        r.email,
        r.phone,
        r.city,
        r.state,
        r.zip,
        r.vehicleEntryCode,
        r.year,
        r.make,
        r.model,
        r.trim,
        r.vehicleClass,
        r.tierName,
        r.registrationStatus,
        r.paymentStatus,
        r.amountPaid,
        r.smsOptIn,
        r.dashCardReady,
        r.vehicleNickname,
        r.vehicleStory,
        r.openToBuyerInquiries,
      ]),
    ),
  ];
  return lines.join("\n");
}
