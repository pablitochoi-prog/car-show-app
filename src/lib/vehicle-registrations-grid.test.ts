import { describe, expect, it, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  eventJudgingClass: { findMany: vi.fn(), findFirst: vi.fn() },
  eventJudgingTemplate: { findMany: vi.fn() },
  eventJudgingSection: { findMany: vi.fn() },
  eventCategory: { findMany: vi.fn() },
  registrationVehicle: { findMany: vi.fn() },
  eventJudgeCategoryAssignment: { findMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

vi.mock("@/lib/event-registration-staff-photos", () => ({
  registrationVehicleStaffPhotoViewPath: () => "/staff-photo",
}));

vi.mock("@/lib/registration-contact", () => ({
  resolveRegistrationContact: () => ({ name: "Pablo Admin", email: "p@x.com" }),
}));

import { loadVehicleRegistrationsGrid } from "@/lib/vehicle-registrations-grid";

describe("loadVehicleRegistrationsGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.eventCategory.findMany.mockResolvedValue([
      {
        id: "ec-1",
        customName: "Little Engine",
        category: { name: "Stock", sortOrder: 0 },
      },
    ]);
  });

  it("returns categories and rows with judge names per section", async () => {
    prismaMock.eventJudgingClass.findFirst.mockResolvedValue({ id: "class-1" });
    prismaMock.eventJudgingClass.findMany.mockResolvedValue([
      { eventJudgingTemplateId: "tpl-1" },
    ]);
    prismaMock.eventJudgingTemplate.findMany.mockResolvedValue([{ id: "tpl-1" }]);
    prismaMock.eventJudgingSection.findMany.mockResolvedValue([
      { id: "sec-ext", name: "Exterior", sortOrder: 0 },
      { id: "sec-int", name: "Interior", sortOrder: 1 },
    ]);
    prismaMock.registrationVehicle.findMany.mockResolvedValue([
      {
        id: "rv-1",
        registrationId: "reg-1",
        eventCategoryId: "ec-1",
        publicVehicleId: "VIN1234",
        eventPhotoObjectKey: null,
        eventCategory: {
          customName: "Little Engine",
          category: { name: "Stock" },
        },
        vehicle: {
          year: 1967,
          make: "Ford",
          model: "Mustang",
          vin: "VIN1234",
          photoUrl: null,
        },
        registration: { userId: "u1", user: { name: "Pablo Admin" } },
      },
    ]);
    prismaMock.eventJudgeCategoryAssignment.findMany.mockResolvedValue([
      {
        registrationVehicleId: "rv-1",
        section: { id: "sec-ext" },
        judge: { name: "Pablo Admin" },
      },
    ]);

    const grid = await loadVehicleRegistrationsGrid("evt-1");

    expect(grid.scoreSheetJudgingEnabled).toBe(true);
    expect(grid.categories).toHaveLength(2);
    expect(grid.rows).toHaveLength(1);
    expect(grid.rows[0]).toMatchObject({
      publicVehicleId: "VIN1234",
      year: 1967,
      make: "Ford",
      model: "Mustang",
      vin: "VIN1234",
      vehicleClass: "Little Engine",
      ownerName: "Pablo Admin",
    });
    expect(grid.rows[0].judgeBySectionId["sec-ext"]).toBe("Pablo Admin");
    expect(grid.rows[0].judgeBySectionId["sec-int"]).toBeNull();
    expect(grid.rows[0].photoUrl).toBe("/api/v/VIN1234/photo");
  });

  it("omits scorecard judge columns when no active judging classes", async () => {
    prismaMock.eventJudgingClass.findFirst.mockResolvedValue(null);
    prismaMock.eventJudgingClass.findMany.mockResolvedValue([]);
    prismaMock.registrationVehicle.findMany.mockResolvedValue([]);
    prismaMock.eventJudgeCategoryAssignment.findMany.mockResolvedValue([]);

    const grid = await loadVehicleRegistrationsGrid("evt-1");

    expect(grid.scoreSheetJudgingEnabled).toBe(false);
    expect(grid.categories).toEqual([]);
    expect(prismaMock.eventJudgingSection.findMany).not.toHaveBeenCalled();
    expect(prismaMock.eventJudgeCategoryAssignment.findMany).not.toHaveBeenCalled();
  });
});
