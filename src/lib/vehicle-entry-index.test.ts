import { describe, expect, it, vi } from "vitest";
import {
  buildDesiredVehicleEntryIndexRows,
  classifyBackfillError,
  countSkippedGuestVehicleRows,
  normalizeVehicleEntryIndexMeaningfulRow,
  parseGuestVehiclesForEntryIndex,
  sanitizeBackfillErrorMessage,
  simulateDryRunIndexCounts,
  upsertVehicleEntryIndexRow,
  vehicleEntryIndexRowsMatch,
  VEHICLE_ENTRY_INDEX_TYPES,
} from "./vehicle-entry-index";

describe("parseGuestVehiclesForEntryIndex", () => {
  it("returns empty for null, non-array, or missing codes", () => {
    expect(parseGuestVehiclesForEntryIndex(null)).toEqual([]);
    expect(parseGuestVehiclesForEntryIndex({})).toEqual([]);
    expect(parseGuestVehiclesForEntryIndex([{ year: 2020 }])).toEqual([]);
  });

  it("parses valid guest rows with array index", () => {
    expect(
      parseGuestVehiclesForEntryIndex([
        { publicVehicleId: "axy-004", year: 2020, make: "Ford", model: "Mustang" },
        null,
        "bad",
        { publicVehicleId: "ABC-005", year: 2021, make: "Chevy", model: "Camaro" },
      ]),
    ).toEqual([
      { guestVehicleIndex: 0, publicVehicleId: "AXY-004" },
      { guestVehicleIndex: 3, publicVehicleId: "ABC-005" },
    ]);
  });
});

describe("buildDesiredVehicleEntryIndexRows", () => {
  const base = {
    eventId: "evt-1",
    registrationId: "reg-1",
  };

  it("builds member registration vehicle rows", () => {
    const rows = buildDesiredVehicleEntryIndexRows({
      ...base,
      registrationVehicles: [
        { id: "rv-1", publicVehicleId: "AXY-001" },
        { id: "rv-2", publicVehicleId: null },
      ],
      guestVehicles: null,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      publicVehicleId: "AXY-001",
      entryType: VEHICLE_ENTRY_INDEX_TYPES.registrationVehicle,
      registrationVehicleId: "rv-1",
      guestVehicleIndex: null,
    });
  });

  it("builds guest JSON rows when no member row owns the code", () => {
    const rows = buildDesiredVehicleEntryIndexRows({
      ...base,
      registrationVehicles: [],
      guestVehicles: [
        { publicVehicleId: "AXY-002", year: 2020, make: "Ford", model: "Mustang" },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      publicVehicleId: "AXY-002",
      entryType: VEHICLE_ENTRY_INDEX_TYPES.guestJson,
      registrationVehicleId: null,
      guestVehicleIndex: 0,
    });
  });

  it("prefers member registration vehicle over guest JSON for the same code", () => {
    const rows = buildDesiredVehicleEntryIndexRows({
      ...base,
      registrationVehicles: [{ id: "rv-1", publicVehicleId: "AXY-003" }],
      guestVehicles: [
        { publicVehicleId: "AXY-003", year: 2020, make: "Ford", model: "Mustang" },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.entryType).toBe(VEHICLE_ENTRY_INDEX_TYPES.registrationVehicle);
    expect(rows[0]?.registrationVehicleId).toBe("rv-1");
  });
});

describe("sanitizeBackfillErrorMessage", () => {
  it("redacts full vehicle codes and emails", () => {
    const msg = sanitizeBackfillErrorMessage(
      "Conflict on AXY-004 for user@test.com",
    );
    expect(msg).toContain("AXY-***");
    expect(msg).not.toContain("004");
    expect(msg).toContain("[email]");
  });
});

describe("classifyBackfillError", () => {
  it("detects missing vehicle_entry_index table", () => {
    const classified = classifyBackfillError(
      new Error('Table `public.vehicle_entry_index` does not exist'),
    );
    expect(classified.errorType).toBe("table_missing");
  });
});

describe("countSkippedGuestVehicleRows", () => {
  it("counts malformed guest JSON without throwing", () => {
    expect(countSkippedGuestVehicleRows(null)).toBe(0);
    expect(countSkippedGuestVehicleRows({})).toBe(1);
    expect(
      countSkippedGuestVehicleRows([
        null,
        { publicVehicleId: "AXY-001" },
        { year: 2020 },
      ]),
    ).toBe(2);
  });
});

describe("vehicleEntryIndexRowsMatch", () => {
  it("treats null and undefined optional fields as equal", () => {
    const existing = normalizeVehicleEntryIndexMeaningfulRow({
      publicVehicleId: "AXY-001",
      eventId: "evt-1",
      registrationId: "reg-1",
      entryType: VEHICLE_ENTRY_INDEX_TYPES.registrationVehicle,
      registrationVehicleId: "rv-1",
      guestVehicleIndex: null,
    });
    const desired = normalizeVehicleEntryIndexMeaningfulRow({
      publicVehicleId: "AXY-001",
      eventId: "evt-1",
      registrationId: "reg-1",
      entryType: VEHICLE_ENTRY_INDEX_TYPES.registrationVehicle,
      registrationVehicleId: "rv-1",
    });

    expect(vehicleEntryIndexRowsMatch(existing, desired)).toBe(true);
  });

  it("detects meaningful field differences", () => {
    const existing = normalizeVehicleEntryIndexMeaningfulRow({
      publicVehicleId: "AXY-001",
      eventId: "evt-1",
      registrationId: "reg-1",
      entryType: VEHICLE_ENTRY_INDEX_TYPES.guestJson,
      registrationVehicleId: null,
      guestVehicleIndex: 0,
    });
    const desired = normalizeVehicleEntryIndexMeaningfulRow({
      publicVehicleId: "AXY-001",
      eventId: "evt-1",
      registrationId: "reg-1",
      entryType: VEHICLE_ENTRY_INDEX_TYPES.guestJson,
      registrationVehicleId: null,
      guestVehicleIndex: 1,
    });

    expect(vehicleEntryIndexRowsMatch(existing, desired)).toBe(false);
  });
});

describe("simulateDryRunIndexCounts", () => {
  it("assumes create when index table is unavailable", () => {
    const desired = buildDesiredVehicleEntryIndexRows({
      eventId: "evt-1",
      registrationId: "reg-1",
      registrationVehicles: [{ id: "rv-1", publicVehicleId: "AXY-001" }],
      guestVehicles: null,
    });

    expect(
      simulateDryRunIndexCounts({
        registrationId: "reg-1",
        desired,
        existingByCode: null,
      }),
    ).toEqual({ created: 1, updated: 0, skipped: 0 });
  });

  it("detects update and cross-registration skip when meaningful fields differ", () => {
    const desired = buildDesiredVehicleEntryIndexRows({
      eventId: "evt-1",
      registrationId: "reg-1",
      registrationVehicles: [
        { id: "rv-1", publicVehicleId: "AXY-001" },
        { id: "rv-2", publicVehicleId: "AXY-002" },
      ],
      guestVehicles: null,
    });

    const existingByCode = new Map([
      [
        "AXY-001",
        normalizeVehicleEntryIndexMeaningfulRow({
          publicVehicleId: "AXY-001",
          eventId: "evt-1",
          registrationId: "reg-1",
          entryType: VEHICLE_ENTRY_INDEX_TYPES.registrationVehicle,
          registrationVehicleId: "rv-old",
          guestVehicleIndex: null,
        }),
      ],
      [
        "AXY-002",
        normalizeVehicleEntryIndexMeaningfulRow({
          publicVehicleId: "AXY-002",
          eventId: "evt-1",
          registrationId: "reg-other",
          entryType: VEHICLE_ENTRY_INDEX_TYPES.registrationVehicle,
          registrationVehicleId: "rv-2",
          guestVehicleIndex: null,
        }),
      ],
    ]);

    expect(
      simulateDryRunIndexCounts({
        registrationId: "reg-1",
        desired,
        existingByCode,
      }),
    ).toEqual({ created: 0, updated: 1, skipped: 1 });
  });

  it("counts matching rows as no-op", () => {
    const desired = buildDesiredVehicleEntryIndexRows({
      eventId: "evt-1",
      registrationId: "reg-1",
      registrationVehicles: [{ id: "rv-1", publicVehicleId: "AXY-001" }],
      guestVehicles: null,
    });

    const existingByCode = new Map([
      [
        "AXY-001",
        normalizeVehicleEntryIndexMeaningfulRow({
          publicVehicleId: "AXY-001",
          eventId: "evt-1",
          registrationId: "reg-1",
          entryType: VEHICLE_ENTRY_INDEX_TYPES.registrationVehicle,
          registrationVehicleId: "rv-1",
          guestVehicleIndex: null,
        }),
      ],
    ]);

    expect(
      simulateDryRunIndexCounts({
        registrationId: "reg-1",
        desired,
        existingByCode,
      }),
    ).toEqual({ created: 0, updated: 0, skipped: 0 });
  });
});

describe("upsertVehicleEntryIndexRow", () => {
  it("creates when code is missing", async () => {
    const create = vi.fn();
    const update = vi.fn();
    const tx = {
      vehicleEntryIndex: {
        findUnique: vi.fn().mockResolvedValue(null),
        create,
        update,
      },
    };

    const result = await upsertVehicleEntryIndexRow(tx as never, {
      publicVehicleId: "AXY-010",
      eventId: "evt-1",
      registrationId: "reg-1",
      entryType: VEHICLE_ENTRY_INDEX_TYPES.registrationVehicle,
      registrationVehicleId: "rv-1",
      guestVehicleIndex: null,
    });

    expect(result).toBe("created");
    expect(create).toHaveBeenCalledOnce();
    expect(update).not.toHaveBeenCalled();
  });

  it("updates when meaningful fields differ", async () => {
    const create = vi.fn();
    const update = vi.fn();
    const tx = {
      vehicleEntryIndex: {
        findUnique: vi.fn().mockResolvedValue({
          id: "idx-1",
          publicVehicleId: "AXY-010",
          eventId: "evt-1",
          registrationId: "reg-1",
          entryType: VEHICLE_ENTRY_INDEX_TYPES.registrationVehicle,
          registrationVehicleId: "rv-1",
          guestVehicleIndex: null,
        }),
        create,
        update,
      },
    };

    const result = await upsertVehicleEntryIndexRow(tx as never, {
      publicVehicleId: "AXY-010",
      eventId: "evt-1",
      registrationId: "reg-1",
      entryType: VEHICLE_ENTRY_INDEX_TYPES.guestJson,
      registrationVehicleId: null,
      guestVehicleIndex: 0,
    });

    expect(result).toBe("updated");
    expect(update).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
  });

  it("returns unchanged when existing row matches meaningful fields", async () => {
    const create = vi.fn();
    const update = vi.fn();
    const tx = {
      vehicleEntryIndex: {
        findUnique: vi.fn().mockResolvedValue({
          id: "idx-1",
          publicVehicleId: "AXY-010",
          eventId: "evt-1",
          registrationId: "reg-1",
          entryType: VEHICLE_ENTRY_INDEX_TYPES.registrationVehicle,
          registrationVehicleId: "rv-1",
          guestVehicleIndex: null,
        }),
        create,
        update,
      },
    };

    const result = await upsertVehicleEntryIndexRow(tx as never, {
      publicVehicleId: "AXY-010",
      eventId: "evt-1",
      registrationId: "reg-1",
      entryType: VEHICLE_ENTRY_INDEX_TYPES.registrationVehicle,
      registrationVehicleId: "rv-1",
      guestVehicleIndex: undefined,
    });

    expect(result).toBe("unchanged");
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
