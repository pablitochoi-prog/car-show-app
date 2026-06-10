import { describe, expect, it, vi, beforeAll, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  canAccessVehiclePhoto: vi.fn(),
  vehiclePhotoFindFirst: vi.fn(),
  readPrivateAsset: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: h.getCurrentUser }));
vi.mock("@/lib/vehicle-photo-access", () => ({
  canAccessVehiclePhoto: h.canAccessVehiclePhoto,
}));
vi.mock("@/lib/db", () => ({
  prisma: { vehiclePhoto: { findFirst: h.vehiclePhotoFindFirst } },
}));
vi.mock("@/lib/storage/private-assets", () => ({
  readPrivateAsset: h.readPrivateAsset,
}));

type RouteCtx = { params: Promise<{ id: string; photoId: string }> };

let GET: (request: Request, ctx: RouteCtx) => Promise<Response>;

beforeAll(async () => {
  ({ GET } = await import("./route"));
});

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(): Request {
  return new Request(
    "https://carshowscout.com/api/vehicles/vehicle-1/photos/photo-1/view",
  );
}

function routeCtx(vehicleId = "vehicle-1", photoId = "photo-1"): RouteCtx {
  return { params: Promise.resolve({ id: vehicleId, photoId }) };
}

const FAKE_PHOTO = {
  id: "photo-1",
  userId: "user-1",
  vehicleId: "vehicle-1",
  objectKey: "vehicle-photos/user-1/vehicle-1/abc.jpg",
  contentType: "image/jpeg",
};

describe("vehicles/[id]/photos/[photoId]/view — authorization", () => {
  it("returns 401 for unauthenticated requests", async () => {
    h.getCurrentUser.mockResolvedValue(null);
    const res = await GET(makeRequest(), routeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 404 when the photo does not exist for this vehicle", async () => {
    h.getCurrentUser.mockResolvedValue({ id: "user-1", platformRole: "USER" });
    h.vehiclePhotoFindFirst.mockResolvedValue(null);
    const res = await GET(makeRequest(), routeCtx());
    expect(res.status).toBe(404);
  });

  it("returns 403 when canAccessVehiclePhoto denies the user", async () => {
    h.getCurrentUser.mockResolvedValue({ id: "user-1", platformRole: "USER" });
    h.vehiclePhotoFindFirst.mockResolvedValue(FAKE_PHOTO);
    h.canAccessVehiclePhoto.mockResolvedValue(false);
    const res = await GET(makeRequest(), routeCtx());
    expect(res.status).toBe(403);
  });

  it("returns 404 when private asset read fails after auth passes", async () => {
    h.getCurrentUser.mockResolvedValue({ id: "user-1", platformRole: "USER" });
    h.vehiclePhotoFindFirst.mockResolvedValue(FAKE_PHOTO);
    h.canAccessVehiclePhoto.mockResolvedValue(true);
    h.readPrivateAsset.mockResolvedValue({ error: "Object not found" });
    const res = await GET(makeRequest(), routeCtx());
    expect(res.status).toBe(404);
  });

  it("returns 200 with image bytes when the owner accesses their photo", async () => {
    h.getCurrentUser.mockResolvedValue({ id: "user-1", platformRole: "USER" });
    h.vehiclePhotoFindFirst.mockResolvedValue(FAKE_PHOTO);
    h.canAccessVehiclePhoto.mockResolvedValue(true);
    h.readPrivateAsset.mockResolvedValue({
      bytes: new Uint8Array([0xff, 0xd8]),
      contentType: "image/jpeg",
    });
    const res = await GET(makeRequest(), routeCtx());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toMatch(/private/);
  });

  it("IDOR: photo from a different vehicle is not returned", async () => {
    // findFirst scopes by vehicleId+photoId; returning null simulates the DB
    // not matching a photo from a different vehicle.
    h.getCurrentUser.mockResolvedValue({ id: "user-1", platformRole: "USER" });
    // Route uses vehicleId "other-vehicle" from URL params but photo belongs to "vehicle-1"
    h.vehiclePhotoFindFirst.mockResolvedValue(null);
    const res = await GET(makeRequest(), routeCtx("other-vehicle", "photo-1"));
    expect(res.status).toBe(404);
  });
});
