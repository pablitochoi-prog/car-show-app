import { describe, expect, it, vi, beforeAll, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  eventFindUnique: vi.fn(),
  listingFindUnique: vi.fn(),
  uploadEventAsset: vi.fn(),
  enforcePublicRateLimit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    event: { findUnique: h.eventFindUnique },
    vehicleSaleListing: { findUnique: h.listingFindUnique },
  },
}));
vi.mock("@/lib/storage/event-assets", () => ({
  uploadEventAsset: h.uploadEventAsset,
}));
vi.mock("@/lib/rate-limit", () => ({
  enforcePublicRateLimit: h.enforcePublicRateLimit,
  resolveClientIp: () => "127.0.0.1",
  hashRateLimitKey: (v: string) => `hash:${v}`,
  resolvePublicRateLimitConfig: () => ({ limit: 10, windowMs: 600_000 }),
}));

let POST: (request: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

beforeAll(async () => {
  ({ POST } = await import("./route"));
});

beforeEach(() => {
  vi.clearAllMocks();
  // Default: rate limit allows
  h.enforcePublicRateLimit.mockReturnValue(null);
  // Default: event is active with sale inquiries enabled
  h.eventFindUnique.mockResolvedValue({
    status: "ACTIVE",
    vehicleSaleInquiriesEnabled: true,
  });
  // Default: listing belongs to the event
  h.listingFindUnique.mockResolvedValue({ eventId: "event-1" });
  h.uploadEventAsset.mockResolvedValue({
    publicUrl: "https://cdn.example.com/photo.jpg",
  });
});

function makeFormData(fields: Record<string, string | File>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value);
  }
  return fd;
}

function makeRequest(formData: FormData): Request {
  return new Request(
    "https://carshowscout.com/api/events/event-1/vehicle-sale-listing-photo/upload",
    { method: "POST", body: formData },
  );
}

function routeCtx(eventId = "event-1") {
  return { params: Promise.resolve({ id: eventId }) };
}

describe("vehicle-sale-listing-photo/upload", () => {
  it("is rate-limited by IP (returns 429 when enforcePublicRateLimit fires)", async () => {
    const { NextResponse } = await import("next/server");
    h.enforcePublicRateLimit.mockReturnValue(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );

    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    const fd = makeFormData({
      listingId: "00000000-0000-1000-8000-000000000001",
      file,
    });

    const res = await POST(makeRequest(fd), routeCtx());
    expect(res.status).toBe(429);
  });

  it("rejects a listingId that belongs to a different event", async () => {
    h.listingFindUnique.mockResolvedValue({ eventId: "other-event" });

    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    const fd = makeFormData({
      listingId: "00000000-0000-1000-8000-000000000001",
      file,
    });

    const res = await POST(makeRequest(fd), routeCtx("event-1"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/listing not found/i);
  });

  it("rejects when listing does not exist", async () => {
    h.listingFindUnique.mockResolvedValue(null);

    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    const fd = makeFormData({
      listingId: "00000000-0000-1000-8000-000000000001",
      file,
    });

    const res = await POST(makeRequest(fd), routeCtx("event-1"));
    expect(res.status).toBe(404);
  });

  it("accepts a valid upload when listing matches the event", async () => {
    const file = new File(["binary-data"], "photo.jpg", { type: "image/jpeg" });
    const fd = makeFormData({
      listingId: "00000000-0000-1000-8000-000000000001",
      file,
    });

    const res = await POST(makeRequest(fd), routeCtx("event-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://cdn.example.com/photo.jpg");
  });
});
