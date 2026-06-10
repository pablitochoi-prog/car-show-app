import { describe, expect, it, vi, beforeAll, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  canViewEventRegistrationStaffPhotos: vi.fn(),
  registrationFindFirst: vi.fn(),
  readEventRegistrationStaffPhoto: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: h.getCurrentUser }));
vi.mock("@/lib/organizer-registrations-auth", () => ({
  canViewEventRegistrationStaffPhotos: h.canViewEventRegistrationStaffPhotos,
}));
vi.mock("@/lib/db", () => ({
  prisma: { registration: { findFirst: h.registrationFindFirst } },
}));
vi.mock("@/lib/event-registration-staff-photos", () => ({
  readEventRegistrationStaffPhoto: h.readEventRegistrationStaffPhoto,
}));

type RouteCtx = {
  params: Promise<{ id: string; registrationId: string }>;
};

let GET: (request: Request, ctx: RouteCtx) => Promise<Response>;

beforeAll(async () => {
  ({ GET } = await import("./route"));
});

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(): Request {
  return new Request(
    "https://carshowscout.com/api/events/event-1/registrations/reg-1/staff-photos/registrant/view",
  );
}

function routeCtx(eventId = "event-1", registrationId = "reg-1"): RouteCtx {
  return { params: Promise.resolve({ id: eventId, registrationId }) };
}

describe("staff-photos/registrant/view — authorization", () => {
  it("returns 401 for unauthenticated requests", async () => {
    h.getCurrentUser.mockResolvedValue(null);
    const res = await GET(makeRequest(), routeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 403 when the user lacks staff photo view permission", async () => {
    h.getCurrentUser.mockResolvedValue({ id: "user-1", platformRole: "USER" });
    h.canViewEventRegistrationStaffPhotos.mockResolvedValue(false);
    const res = await GET(makeRequest(), routeCtx());
    expect(res.status).toBe(403);
  });

  it("returns 404 when registrationId does not belong to this event (IDOR guard)", async () => {
    h.getCurrentUser.mockResolvedValue({ id: "staff-1", platformRole: "USER" });
    h.canViewEventRegistrationStaffPhotos.mockResolvedValue(true);
    // DB query scopes on both registrationId AND eventId; null means no match
    h.registrationFindFirst.mockResolvedValue(null);
    const res = await GET(makeRequest(), routeCtx("event-2", "reg-1"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when the registration has no registrantPhotoObjectKey", async () => {
    h.getCurrentUser.mockResolvedValue({ id: "staff-1", platformRole: "USER" });
    h.canViewEventRegistrationStaffPhotos.mockResolvedValue(true);
    h.registrationFindFirst.mockResolvedValue({ registrantPhotoObjectKey: null });
    const res = await GET(makeRequest(), routeCtx());
    expect(res.status).toBe(404);
  });

  it("returns 404 when the private asset read fails", async () => {
    h.getCurrentUser.mockResolvedValue({ id: "staff-1", platformRole: "USER" });
    h.canViewEventRegistrationStaffPhotos.mockResolvedValue(true);
    h.registrationFindFirst.mockResolvedValue({
      registrantPhotoObjectKey: "event-registration-photos/event-1/reg-1/registrant.jpg",
    });
    h.readEventRegistrationStaffPhoto.mockResolvedValue({ error: "Not found" });
    const res = await GET(makeRequest(), routeCtx());
    expect(res.status).toBe(404);
  });

  it("returns 200 with image bytes for an authorized staff member", async () => {
    h.getCurrentUser.mockResolvedValue({ id: "staff-1", platformRole: "USER" });
    h.canViewEventRegistrationStaffPhotos.mockResolvedValue(true);
    h.registrationFindFirst.mockResolvedValue({
      registrantPhotoObjectKey: "event-registration-photos/event-1/reg-1/registrant.jpg",
    });
    h.readEventRegistrationStaffPhoto.mockResolvedValue({
      bytes: new Uint8Array([0xff, 0xd8]),
      contentType: "image/jpeg",
    });
    const res = await GET(makeRequest(), routeCtx());
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toMatch(/private/);
  });
});
