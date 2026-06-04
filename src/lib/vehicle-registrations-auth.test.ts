import { describe, expect, it, vi, beforeEach } from "vitest";

const { getUserEventRoles, userHasOrganizerStaffRole, userHasHeadJudgeStaffRole } =
  vi.hoisted(() => ({
    getUserEventRoles: vi.fn(),
    userHasOrganizerStaffRole: vi.fn(),
    userHasHeadJudgeStaffRole: vi.fn(),
  }));

const { canManageEvent } = vi.hoisted(() => ({
  canManageEvent: vi.fn(),
}));

vi.mock("@/lib/event-staff", () => ({
  getUserEventRoles,
  userHasOrganizerStaffRole,
  userHasHeadJudgeStaffRole,
}));
vi.mock("@/lib/auth", () => ({ canManageEvent }));

import { canManageVehicleRegistrations } from "@/lib/vehicle-registrations-auth";

describe("canManageVehicleRegistrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userHasOrganizerStaffRole.mockResolvedValue(false);
    userHasHeadJudgeStaffRole.mockResolvedValue(false);
    canManageEvent.mockResolvedValue(false);
  });

  it("allows platform admins without event roles", async () => {
    getUserEventRoles.mockResolvedValue([]);
    expect(await canManageVehicleRegistrations("u", "e", "ADMIN")).toBe(true);
    expect(getUserEventRoles).not.toHaveBeenCalled();
  });

  it("allows organizer and head judge permission roles", async () => {
    getUserEventRoles.mockResolvedValue(["ORGANIZER"]);
    expect(await canManageVehicleRegistrations("u", "e", "USER")).toBe(true);

    getUserEventRoles.mockResolvedValue(["HEAD_JUDGE"]);
    expect(await canManageVehicleRegistrations("u", "e", "USER")).toBe(true);
  });

  it("allows organizer or head judge staff slugs when enum mapping is empty", async () => {
    getUserEventRoles.mockResolvedValue([]);
    userHasOrganizerStaffRole.mockResolvedValue(true);
    expect(await canManageVehicleRegistrations("u", "e", "USER")).toBe(true);

    userHasOrganizerStaffRole.mockResolvedValue(false);
    userHasHeadJudgeStaffRole.mockResolvedValue(true);
    expect(await canManageVehicleRegistrations("u", "e", "USER")).toBe(true);
  });

  it("allows org owners via canManageEvent", async () => {
    getUserEventRoles.mockResolvedValue([]);
    canManageEvent.mockResolvedValue(true);
    expect(await canManageVehicleRegistrations("u", "e", "USER")).toBe(true);
  });

  it("denies judge without manage access", async () => {
    getUserEventRoles.mockResolvedValue(["JUDGE"]);
    expect(await canManageVehicleRegistrations("u", "e", "USER")).toBe(false);
  });
});
