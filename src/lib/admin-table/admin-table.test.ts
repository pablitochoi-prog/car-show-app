import { describe, expect, it } from "vitest";
import { parseAdminTableParams, buildAdminTableSearchParams } from "./parse-admin-table-params";
import { eventsAdminTableConfig } from "./events-table-config";
import { buildEventsAdminWhere } from "./events-table-config";
import { usersAdminTableConfig, buildUsersAdminWhere } from "./users-table-config";
import { adminTableMeta } from "./admin-table-response";

describe("parseAdminTableParams", () => {
  it("applies defaults for events", () => {
    const params = parseAdminTableParams(new URLSearchParams(), eventsAdminTableConfig);
    expect(params).toMatchObject({
      sort: "startDate",
      sortDir: "desc",
      page: 1,
      pageSize: 25,
      q: "",
    });
  });

  it("parses events URL params", () => {
    const sp = new URLSearchParams({
      events_sort: "name",
      events_sortDir: "asc",
      events_page: "2",
      events_pageSize: "50",
      events_q: "car show",
      "events_f.status": "PUBLISHED",
    });
    const params = parseAdminTableParams(sp, eventsAdminTableConfig);
    expect(params.sort).toBe("name");
    expect(params.sortDir).toBe("asc");
    expect(params.page).toBe(2);
    expect(params.pageSize).toBe(50);
    expect(params.q).toBe("car show");
    expect(params.filters.status).toBe("PUBLISHED");
  });

  it("ignores unknown sort keys", () => {
    const sp = new URLSearchParams({ events_sort: "registrants" });
    const params = parseAdminTableParams(sp, eventsAdminTableConfig);
    expect(params.sort).toBe("startDate");
  });

  it("clamps pageSize to max 100", () => {
    const sp = new URLSearchParams({ users_pageSize: "500" });
    const params = parseAdminTableParams(sp, usersAdminTableConfig);
    expect(params.pageSize).toBe(100);
  });

  it("buildAdminTableSearchParams round-trips filters", () => {
    const sp = buildAdminTableSearchParams("users", {
      sort: "email",
      sortDir: "asc",
      page: 1,
      q: "test",
      filters: { status: "ACTIVE", email: null },
    });
    expect(sp.get("users_sort")).toBe("email");
    expect(sp.get("users_q")).toBe("test");
    expect(sp.get("users_f.status")).toBe("ACTIVE");
    expect(sp.has("users_f.email")).toBe(false);
  });
});

describe("buildEventsAdminWhere", () => {
  it("combines global q and column filters", () => {
    const where = buildEventsAdminWhere({
      sort: "startDate",
      sortDir: "desc",
      page: 1,
      pageSize: 25,
      q: "classic",
      filters: { status: "DRAFT", orgName: "Mustang" },
    });
    expect(where.AND).toBeDefined();
    expect(Array.isArray(where.AND)).toBe(true);
  });
});

describe("buildUsersAdminWhere", () => {
  it("filters by role enum safely", () => {
    const where = buildUsersAdminWhere({
      sort: "createdAt",
      sortDir: "desc",
      page: 1,
      pageSize: 25,
      q: "",
      filters: { platformRole: "ADMIN", status: "INVALID" },
    });
    const and = where.AND as Record<string, unknown>[];
    expect(and.some((c) => "platformRole" in c)).toBe(true);
    expect(and.some((c) => "status" in c)).toBe(false);
  });
});

describe("adminTableMeta", () => {
  it("computes totalPages", () => {
    expect(adminTableMeta(101, 1, 25).totalPages).toBe(5);
  });
});
