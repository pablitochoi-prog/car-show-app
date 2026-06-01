import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  vehicleEntryIndex: { findUnique: vi.fn() },
  registrationVehicle: { findUnique: vi.fn(), findFirst: vi.fn() },
  registration: { findMany: vi.fn(), findUnique: vi.fn() },
  event: { findMany: vi.fn() },
  eventCategory: { findMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/perf-timing", () => ({
  logPerfTiming: vi.fn(),
  perfTimingStart: vi.fn(() => 0),
  perfTimingElapsed: vi.fn(() => 1),
  vehicleEntryCodePrefix: vi.fn((code: string) => code.split("-")[0] ?? ""),
}));

import {
  findVehicleEntryByCode,
  isVehicleEntryIndexLookupEnabled,
  resolveVehicleEntryFromIndex,
} from "./vehicle-entry-lookup";

const sampleEvent = {
  id: "evt-1",
  name: "Spring Show",
  status: "PUBLISHED" as const,
  startDate: new Date("2026-06-01"),
  endDate: null,
  venue: "Fairgrounds",
  city: "Austin",
  state: "TX",
};

const memberRv = {
  id: "rv-1",
  vehicleId: "veh-1",
  publicVehicleId: "AXY-001",
  eventPhotoObjectKey: null,
  vehicleQrObjectKey: null,
  vehicleQrUrl: null,
  votingStatus: null,
  judgingStatus: null,
  eventCategoryId: null,
  vehicle: {
    year: 1969,
    make: "Ford",
    model: "Mustang",
    trim: null,
    nickname: null,
    photoUrl: null,
  },
  eventCategory: null,
  registration: {
    id: "reg-1",
    eventId: "evt-1",
    event: sampleEvent,
  },
};

const guestRegistration = {
  id: "reg-guest-1",
  eventId: "evt-1",
  guestVehicles: [
    {
      publicVehicleId: "AXY-002",
      year: 1970,
      make: "Chevy",
      model: "Camaro",
      trim: null,
      nickname: null,
      photoUrl: null,
      eventCategoryId: null,
    },
  ],
  event: sampleEvent,
};

describe("isVehicleEntryIndexLookupEnabled", () => {
  const original = process.env.VEHICLE_ENTRY_INDEX_LOOKUP_ENABLED;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.VEHICLE_ENTRY_INDEX_LOOKUP_ENABLED;
    } else {
      process.env.VEHICLE_ENTRY_INDEX_LOOKUP_ENABLED = original;
    }
  });

  it("defaults to enabled", () => {
    delete process.env.VEHICLE_ENTRY_INDEX_LOOKUP_ENABLED;
    expect(isVehicleEntryIndexLookupEnabled()).toBe(true);
  });

  it("disables when env is false", () => {
    process.env.VEHICLE_ENTRY_INDEX_LOOKUP_ENABLED = "false";
    expect(isVehicleEntryIndexLookupEnabled()).toBe(false);
  });
});

describe("resolveVehicleEntryFromIndex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves indexed member lookup", async () => {
    prismaMock.vehicleEntryIndex.findUnique.mockResolvedValue({
      entryType: "REGISTRATION_VEHICLE",
      eventId: "evt-1",
      registrationId: "reg-1",
      registrationVehicleId: "rv-1",
      guestVehicleIndex: null,
    });
    prismaMock.registrationVehicle.findFirst.mockResolvedValue(memberRv);

    const result = await resolveVehicleEntryFromIndex("AXY-001");

    expect(result.kind).toBe("hit");
    if (result.kind === "hit") {
      expect(result.lookupPath).toBe("vehicle_entry_index_member");
      expect(result.entry.kind).toBe("registration_vehicle");
      expect(result.entry.registrationVehicleId).toBe("rv-1");
    }
  });

  it("resolves indexed guest lookup", async () => {
    prismaMock.vehicleEntryIndex.findUnique.mockResolvedValue({
      entryType: "GUEST_JSON",
      eventId: "evt-1",
      registrationId: "reg-guest-1",
      registrationVehicleId: null,
      guestVehicleIndex: 0,
    });
    prismaMock.registration.findUnique.mockResolvedValue(guestRegistration);
    prismaMock.eventCategory.findMany.mockResolvedValue([]);

    const result = await resolveVehicleEntryFromIndex("AXY-002");

    expect(result.kind).toBe("hit");
    if (result.kind === "hit") {
      expect(result.lookupPath).toBe("vehicle_entry_index_guest");
      expect(result.entry.kind).toBe("guest_json");
      expect(result.entry.guestVehicleIndex).toBe(0);
    }
  });

  it("returns miss when index row is absent", async () => {
    prismaMock.vehicleEntryIndex.findUnique.mockResolvedValue(null);

    const result = await resolveVehicleEntryFromIndex("AXY-999");

    expect(result).toEqual({
      kind: "miss",
      lookupPath: "vehicle_entry_index_miss",
    });
  });

  it("returns stale when member reference is missing", async () => {
    prismaMock.vehicleEntryIndex.findUnique.mockResolvedValue({
      entryType: "REGISTRATION_VEHICLE",
      eventId: "evt-1",
      registrationId: "reg-1",
      registrationVehicleId: "rv-missing",
      guestVehicleIndex: null,
    });
    prismaMock.registrationVehicle.findFirst.mockResolvedValue(null);

    const result = await resolveVehicleEntryFromIndex("AXY-001");

    expect(result).toEqual({
      kind: "stale",
      lookupPath: "vehicle_entry_index_stale_fallback",
    });
  });

  it("returns stale when guest index is out of bounds", async () => {
    prismaMock.vehicleEntryIndex.findUnique.mockResolvedValue({
      entryType: "GUEST_JSON",
      eventId: "evt-1",
      registrationId: "reg-guest-1",
      registrationVehicleId: null,
      guestVehicleIndex: 3,
    });
    prismaMock.registration.findUnique.mockResolvedValue(guestRegistration);

    const result = await resolveVehicleEntryFromIndex("AXY-002");

    expect(result).toEqual({
      kind: "stale",
      lookupPath: "vehicle_entry_index_stale_fallback",
    });
  });
});

describe("findVehicleEntryByCode", () => {
  const originalFlag = process.env.VEHICLE_ENTRY_INDEX_LOOKUP_ENABLED;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.VEHICLE_ENTRY_INDEX_LOOKUP_ENABLED;
  });

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.VEHICLE_ENTRY_INDEX_LOOKUP_ENABLED;
    } else {
      process.env.VEHICLE_ENTRY_INDEX_LOOKUP_ENABLED = originalFlag;
    }
  });

  it("falls back to legacy member lookup on index miss", async () => {
    prismaMock.vehicleEntryIndex.findUnique.mockResolvedValue(null);
    prismaMock.registrationVehicle.findUnique.mockResolvedValue(memberRv);

    const entry = await findVehicleEntryByCode("axy-001");

    expect(entry?.kind).toBe("registration_vehicle");
    expect(prismaMock.registrationVehicle.findUnique).toHaveBeenCalledOnce();
  });

  it("falls back to legacy guest scan when index is stale", async () => {
    prismaMock.vehicleEntryIndex.findUnique.mockResolvedValue({
      entryType: "GUEST_JSON",
      eventId: "evt-1",
      registrationId: "reg-guest-1",
      registrationVehicleId: null,
      guestVehicleIndex: 9,
    });
    prismaMock.registration.findUnique.mockResolvedValue(guestRegistration);
    prismaMock.registrationVehicle.findUnique.mockResolvedValue(null);
    prismaMock.event.findMany.mockResolvedValue([{ id: "evt-1" }]);
    prismaMock.eventCategory.findMany.mockResolvedValue([]);
    prismaMock.registration.findMany.mockResolvedValue([guestRegistration]);

    const entry = await findVehicleEntryByCode("AXY-002");

    expect(entry?.kind).toBe("guest_json");
    expect(prismaMock.registration.findMany).toHaveBeenCalledOnce();
  });

  it("uses legacy lookup only when feature flag is disabled", async () => {
    process.env.VEHICLE_ENTRY_INDEX_LOOKUP_ENABLED = "false";
    prismaMock.registrationVehicle.findUnique.mockResolvedValue(memberRv);

    const entry = await findVehicleEntryByCode("AXY-001");

    expect(entry?.kind).toBe("registration_vehicle");
    expect(prismaMock.vehicleEntryIndex.findUnique).not.toHaveBeenCalled();
  });
});
