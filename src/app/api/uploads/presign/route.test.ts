import { describe, expect, it, vi, beforeAll, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  canManageEvent: vi.fn(),
  getOrgMembership: vi.fn(),
  canAccessVehicle: vi.fn(),
  userOwnsVehicle: vi.fn(),
  vehicleFindUnique: vi.fn(),
  vehicleSaleListingFindFirst: vi.fn(),
  getSignedUrl: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: h.getCurrentUser,
  canManageEvent: h.canManageEvent,
  getOrgMembership: h.getOrgMembership,
}));
vi.mock("@/lib/vehicle-photo-access", () => ({
  canAccessVehicle: h.canAccessVehicle,
  userOwnsVehicle: h.userOwnsVehicle,
  GARAGE_PHOTO_CONTENT_TYPES: new Set(["image/jpeg"]),
  GARAGE_PHOTO_MAX_BYTES: 10 * 1024 * 1024,
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    vehicle: { findUnique: h.vehicleFindUnique },
    vehicleSaleListing: { findFirst: h.vehicleSaleListingFindFirst },
  },
}));
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: h.getSignedUrl,
}));
vi.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: vi.fn().mockImplementation((input) => input),
  S3Client: vi.fn(),
}));
vi.mock("@/lib/r2", () => ({
  privateAssetsR2: {},
  publicPhotosR2: {},
  r2Buckets: { publicPhotos: "public-bucket", privateAssets: "private-bucket" },
  r2PublicUrls: { publicPhotos: "https://cdn.example.com" },
}));

let POST: (request: Request) => Promise<Response>;

beforeAll(async () => {
  ({ POST } = await import("./route"));
});

beforeEach(() => {
  vi.clearAllMocks();
  h.getSignedUrl.mockResolvedValue("https://signed-url.example.com/upload");
});

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("https://carshowscout.com/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function userWith(platformRole: string) {
  return { id: "user-1", platformRole };
}

describe("uploads/presign authorization", () => {
  it("denies unrecognized uploadPurpose with 400", async () => {
    h.getCurrentUser.mockResolvedValue(userWith("USER"));
    const res = await POST(
      makeRequest({
        uploadPurpose: "unknownPurpose",
        filename: "file.jpg",
        contentType: "image/jpeg",
        sizeBytes: 1024,
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/uploadPurpose/i);
  });

  it("non-admin cannot presign platformSponsorLogo", async () => {
    h.getCurrentUser.mockResolvedValue(userWith("ORGANIZER"));
    const res = await POST(
      makeRequest({
        uploadPurpose: "platformSponsorLogo",
        filename: "logo.png",
        contentType: "image/png",
        sizeBytes: 2048,
      }),
    );
    expect(res.status).toBe(403);
  });

  it("admin can presign platformSponsorLogo", async () => {
    h.getCurrentUser.mockResolvedValue(userWith("ADMIN"));
    const res = await POST(
      makeRequest({
        uploadPurpose: "platformSponsorLogo",
        filename: "logo.png",
        contentType: "image/png",
        sizeBytes: 2048,
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.uploadUrl).toBe("https://signed-url.example.com/upload");
  });

  it("vehicleSalePhoto rejects a user who does not manage the event and does not own the listing", async () => {
    h.getCurrentUser.mockResolvedValue(userWith("USER"));
    h.canManageEvent.mockResolvedValue(false);
    h.vehicleSaleListingFindFirst.mockResolvedValue({
      sellerUserId: "other-user",
      registration: { userId: "other-user" },
    });

    const res = await POST(
      makeRequest({
        uploadPurpose: "vehicleSalePhoto",
        filename: "car.jpg",
        contentType: "image/jpeg",
        sizeBytes: 1024,
        eventId: "event-1",
        listingId: "listing-1",
      }),
    );
    expect(res.status).toBe(403);
  });

  it("vehicleSalePhoto allows an event manager", async () => {
    h.getCurrentUser.mockResolvedValue(userWith("ORGANIZER"));
    h.canManageEvent.mockResolvedValue(true);

    const res = await POST(
      makeRequest({
        uploadPurpose: "vehicleSalePhoto",
        filename: "car.jpg",
        contentType: "image/jpeg",
        sizeBytes: 1024,
        eventId: "event-1",
        listingId: "listing-1",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("vehicleSalePhoto allows the listing owner (sellerUserId)", async () => {
    h.getCurrentUser.mockResolvedValue(userWith("USER"));
    h.canManageEvent.mockResolvedValue(false);
    h.vehicleSaleListingFindFirst.mockResolvedValue({
      sellerUserId: "user-1",
      registration: { userId: "other-user" },
    });

    const res = await POST(
      makeRequest({
        uploadPurpose: "vehicleSalePhoto",
        filename: "car.jpg",
        contentType: "image/jpeg",
        sizeBytes: 1024,
        eventId: "event-1",
        listingId: "listing-1",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("vehicleSalePhoto allows the registration owner", async () => {
    h.getCurrentUser.mockResolvedValue(userWith("USER"));
    h.canManageEvent.mockResolvedValue(false);
    h.vehicleSaleListingFindFirst.mockResolvedValue({
      sellerUserId: null,
      registration: { userId: "user-1" },
    });

    const res = await POST(
      makeRequest({
        uploadPurpose: "vehicleSalePhoto",
        filename: "car.jpg",
        contentType: "image/jpeg",
        sizeBytes: 1024,
        eventId: "event-1",
        listingId: "listing-1",
      }),
    );
    expect(res.status).toBe(200);
  });
});

describe("uploads/presign — importRawFile authorization gap", () => {
  // TODO(security): importRawFile presign allows ANY authenticated user to upload
  // to any importJobId path. The importJobId should be validated against a DB record
  // owned by the requesting user before presigning. Tracked for follow-up in PR5.
  //
  // Current behavior (documented below): a regular user with a valid importJobId
  // receives a presigned URL, regardless of whether they created the import job.

  it("grants any authenticated user a presigned URL for importRawFile (known gap)", async () => {
    h.getCurrentUser.mockResolvedValue(userWith("USER"));
    const res = await POST(
      makeRequest({
        uploadPurpose: "importRawFile",
        filename: "data.csv",
        contentType: "text/csv",
        sizeBytes: 1024,
        importJobId: "00000000-0000-1000-8000-000000000001",
      }),
    );
    // Passes today — documents that no ownership check is performed.
    expect(res.status).toBe(200);
    const json = await res.json() as { uploadUrl: string; visibility: string };
    expect(json.uploadUrl).toBeTruthy();
    expect(json.visibility).toBe("private");
  });

  it("rejects unauthenticated requests for importRawFile", async () => {
    h.getCurrentUser.mockResolvedValue(null);
    const res = await POST(
      makeRequest({
        uploadPurpose: "importRawFile",
        filename: "data.csv",
        contentType: "text/csv",
        sizeBytes: 1024,
        importJobId: "00000000-0000-1000-8000-000000000001",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects importRawFile when importJobId is missing", async () => {
    h.getCurrentUser.mockResolvedValue(userWith("USER"));
    const res = await POST(
      makeRequest({
        uploadPurpose: "importRawFile",
        filename: "data.csv",
        contentType: "text/csv",
        sizeBytes: 1024,
        // importJobId intentionally omitted
      }),
    );
    expect(res.status).toBe(400);
  });
});
