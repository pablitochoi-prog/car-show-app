import { describe, expect, it, vi, beforeAll, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  canManageEvent: vi.fn(),
  getUserEventRoles: vi.fn(),
  eventFindUnique: vi.fn(),
  registrationFindMany: vi.fn(),
  resolveRegistrationContact: vi.fn(),
  formatEventShowNumber: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: h.getCurrentUser,
  canManageEvent: h.canManageEvent,
}));
vi.mock("@/lib/event-staff", () => ({
  getUserEventRoles: h.getUserEventRoles,
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    event: { findUnique: h.eventFindUnique },
    registration: { findMany: h.registrationFindMany },
  },
}));
vi.mock("@/lib/registration-contact", () => ({
  resolveRegistrationContact: h.resolveRegistrationContact,
}));
vi.mock("@/lib/event-show-number", () => ({
  formatEventShowNumber: h.formatEventShowNumber,
}));

type RouteCtx = { params: Promise<{ id: string }> };

let GET: (request: Request, ctx: RouteCtx) => Promise<Response>;

beforeAll(async () => {
  ({ GET } = await import("./route"));
});

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no event roles, no management access
  h.getUserEventRoles.mockResolvedValue([]);
  h.canManageEvent.mockResolvedValue(false);
});

function makeRequest(eventId = "event-1"): Request {
  return new Request(
    `https://carshowscout.com/api/events/${eventId}/registrations/export`,
  );
}

function routeCtx(eventId = "event-1"): RouteCtx {
  return { params: Promise.resolve({ id: eventId }) };
}

describe("registrations/export — authorization", () => {
  it("returns 401 for unauthenticated requests", async () => {
    h.getCurrentUser.mockResolvedValue(null);
    const res = await GET(makeRequest(), routeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 403 for a user with no event roles and no management access", async () => {
    h.getCurrentUser.mockResolvedValue({ id: "user-1", platformRole: "USER" });
    // getUserEventRoles returns [] and canManageEvent returns false (defaults above)
    const res = await GET(makeRequest(), routeCtx());
    expect(res.status).toBe(403);
  });

  it("IDOR: manager of event-A cannot export registrations for event-B", async () => {
    h.getCurrentUser.mockResolvedValue({ id: "manager-1", platformRole: "USER" });
    // User is ORGANIZER for event-A but has no role for event-B
    h.getUserEventRoles.mockImplementation(async (_userId: string, eventId: string) => {
      return eventId === "event-a" ? ["ORGANIZER"] : [];
    });
    h.canManageEvent.mockResolvedValue(false);
    const res = await GET(makeRequest("event-b"), routeCtx("event-b"));
    expect(res.status).toBe(403);
  });

  it("allows a user with ORGANIZER event role to export", async () => {
    h.getCurrentUser.mockResolvedValue({ id: "manager-1", platformRole: "USER" });
    h.getUserEventRoles.mockResolvedValue(["ORGANIZER"]);
    h.eventFindUnique.mockResolvedValue({ name: "Spring Show", showNumber: 1 });
    h.registrationFindMany.mockResolvedValue([]);
    h.formatEventShowNumber.mockReturnValue("S001");
    const res = await GET(makeRequest(), routeCtx());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const csv = await res.text();
    expect(csv).toContain("event_show_number");
  });

  it("allows a user with REGISTRAR event role to export", async () => {
    h.getCurrentUser.mockResolvedValue({ id: "registrar-1", platformRole: "USER" });
    h.getUserEventRoles.mockResolvedValue(["REGISTRAR"]);
    h.eventFindUnique.mockResolvedValue({ name: "Summer Show", showNumber: 2 });
    h.registrationFindMany.mockResolvedValue([]);
    h.formatEventShowNumber.mockReturnValue("S002");
    const res = await GET(makeRequest(), routeCtx());
    expect(res.status).toBe(200);
  });

  it("allows a platform manager (canManageEvent=true) even without an event role", async () => {
    h.getCurrentUser.mockResolvedValue({ id: "admin-1", platformRole: "ADMIN" });
    // No event-specific role but canManageEvent returns true
    h.canManageEvent.mockResolvedValue(true);
    h.eventFindUnique.mockResolvedValue({ name: "Admin Event", showNumber: 3 });
    h.registrationFindMany.mockResolvedValue([]);
    h.formatEventShowNumber.mockReturnValue("S003");
    const res = await GET(makeRequest(), routeCtx());
    expect(res.status).toBe(200);
  });
});
