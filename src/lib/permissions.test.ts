import { describe, expect, it } from "vitest";
import {
  isSiteAdmin,
  isOrganizerOrAbove,
  canCreateEvent,
  canCreateOrganization,
  canAssignEventStaff,
  canEditEvent,
  hasEventRole,
  isEventOrganizer,
  canJudge,
  canManageFinances,
  canManageAttendees,
  canEditPromo,
} from "./permissions";

const admin = { platformRole: "ADMIN" as const };
const organizer = { platformRole: "ORGANIZER" as const };
const registrant = { platformRole: "USER" as const };

describe("site-level roles", () => {
  it("isSiteAdmin", () => {
    expect(isSiteAdmin(admin)).toBe(true);
    expect(isSiteAdmin(organizer)).toBe(false);
    expect(isSiteAdmin(registrant)).toBe(false);
  });

  it("isOrganizerOrAbove", () => {
    expect(isOrganizerOrAbove(admin)).toBe(true);
    expect(isOrganizerOrAbove(organizer)).toBe(true);
    expect(isOrganizerOrAbove(registrant)).toBe(false);
  });

  it("canCreateEvent", () => {
    expect(canCreateEvent(admin)).toBe(true);
    expect(canCreateEvent(organizer)).toBe(true);
    expect(canCreateEvent(registrant)).toBe(false);
  });

  it("canCreateOrganization", () => {
    expect(canCreateOrganization(admin)).toBe(true);
    expect(canCreateOrganization(organizer)).toBe(true);
    expect(canCreateOrganization(registrant)).toBe(false);
  });
});

describe("event-scoped role checks", () => {
  it("hasEventRole", () => {
    expect(hasEventRole(["JUDGE", "MARKETING"], "JUDGE")).toBe(true);
    expect(hasEventRole(["JUDGE", "MARKETING"], "ORGANIZER")).toBe(false);
    expect(hasEventRole([], "JUDGE")).toBe(false);
  });

  it("isEventOrganizer", () => {
    expect(isEventOrganizer(["ORGANIZER", "JUDGE"])).toBe(true);
    expect(isEventOrganizer(["JUDGE"])).toBe(false);
  });

  it("canAssignEventStaff — organizer staff role", () => {
    expect(canAssignEventStaff(registrant, ["ORGANIZER"])).toBe(true);
    expect(canAssignEventStaff(registrant, ["JUDGE"])).toBe(false);
  });

  it("canAssignEventStaff — site admin always can", () => {
    expect(canAssignEventStaff(admin, [])).toBe(true);
    expect(canAssignEventStaff(admin, ["JUDGE"])).toBe(true);
  });

  it("canEditEvent", () => {
    expect(canEditEvent(registrant, ["ORGANIZER"])).toBe(true);
    expect(canEditEvent(registrant, ["JUDGE"])).toBe(false);
    expect(canEditEvent(admin, [])).toBe(true);
  });

  it("role-specific helpers", () => {
    expect(canJudge(["JUDGE", "MARKETING"])).toBe(true);
    expect(canJudge(["ORGANIZER"])).toBe(false);

    expect(canManageFinances(["TREASURER"])).toBe(true);
    expect(canManageFinances(["JUDGE"])).toBe(false);

    expect(canManageAttendees(["REGISTRAR"])).toBe(true);
    expect(canManageAttendees(["MARKETING"])).toBe(false);

    expect(canEditPromo(["MARKETING"])).toBe(true);
    expect(canEditPromo(["ORGANIZER"])).toBe(false);
  });

  it("a user can hold multiple roles simultaneously", () => {
    const roles = ["JUDGE", "MARKETING"] as const;
    expect(canJudge([...roles])).toBe(true);
    expect(canEditPromo([...roles])).toBe(true);
    expect(isEventOrganizer([...roles])).toBe(false);
  });
});
