import { describe, expect, it } from "vitest";
import {
  ORGANIZER_REGISTRATIONS_DEFAULT_PAGE_SIZE,
  ORGANIZER_REGISTRATIONS_MAX_PAGE_SIZE,
  buildOrganizerRegistrationsWhere,
  clampOrganizerRegistrationsPage,
  parseOrganizerRegistrationsSearchParams,
} from "./organizer-registrations-list-query";

describe("parseOrganizerRegistrationsSearchParams", () => {
  it("defaults to page 1 and pageSize 50", () => {
    expect(parseOrganizerRegistrationsSearchParams({})).toEqual({
      page: 1,
      pageSize: ORGANIZER_REGISTRATIONS_DEFAULT_PAGE_SIZE,
      sort: "name",
      sortDir: "asc",
      statusFilter: null,
      tierFilter: null,
    });
  });

  it("clamps pageSize to max 100", () => {
    expect(
      parseOrganizerRegistrationsSearchParams({ pageSize: "500" }).pageSize,
    ).toBe(ORGANIZER_REGISTRATIONS_MAX_PAGE_SIZE);
  });

  it("defaults invalid page to 1", () => {
    expect(parseOrganizerRegistrationsSearchParams({ page: "0" }).page).toBe(1);
    expect(parseOrganizerRegistrationsSearchParams({ page: "abc" }).page).toBe(
      1,
    );
  });

  it("parses page 2 offset params and filters", () => {
    expect(
      parseOrganizerRegistrationsSearchParams({
        page: "2",
        pageSize: "25",
        sort: "tier",
        sortDir: "desc",
        status: "Pending,Cancelled",
        tier: "General,Show",
      }),
    ).toEqual({
      page: 2,
      pageSize: 25,
      sort: "tier",
      sortDir: "desc",
      statusFilter: ["Pending", "Cancelled"],
      tierFilter: ["General", "Show"],
    });
  });
});

describe("clampOrganizerRegistrationsPage", () => {
  it("returns page 1 when total count is zero", () => {
    expect(clampOrganizerRegistrationsPage(5, 0, 50)).toBe(1);
  });

  it("clamps page beyond last page", () => {
    expect(clampOrganizerRegistrationsPage(9, 120, 50)).toBe(3);
  });

  it("keeps valid page numbers", () => {
    expect(clampOrganizerRegistrationsPage(2, 120, 50)).toBe(2);
  });
});

describe("buildOrganizerRegistrationsWhere", () => {
  it("always scopes to eventId", () => {
    expect(buildOrganizerRegistrationsWhere("evt-1", {})).toEqual({
      eventId: "evt-1",
    });
  });

  it("adds tier filter when provided", () => {
    expect(
      buildOrganizerRegistrationsWhere("evt-1", {
        tierFilter: ["General"],
        statusFilter: null,
      }),
    ).toEqual({
      AND: [{ eventId: "evt-1" }, { tier: { name: { in: ["General"] } } }],
    });
  });
});
