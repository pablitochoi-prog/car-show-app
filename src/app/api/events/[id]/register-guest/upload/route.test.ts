import { describe, expect, it, vi, beforeAll, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  eventFindUnique: vi.fn(),
  uploadEventAsset: vi.fn(),
  enforcePublicRateLimit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    event: { findUnique: h.eventFindUnique },
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
  h.enforcePublicRateLimit.mockReturnValue(null);
  h.eventFindUnique.mockResolvedValue({ status: "ACTIVE" });
  h.uploadEventAsset.mockResolvedValue({
    publicUrl: "https://cdn.example.com/vehicle.jpg",
  });
});

function routeCtx(eventId = "event-1") {
  return { params: Promise.resolve({ id: eventId }) };
}

describe("register-guest/upload", () => {
  it("is rate-limited by IP (returns 429 when enforcePublicRateLimit fires)", async () => {
    const { NextResponse } = await import("next/server");
    h.enforcePublicRateLimit.mockReturnValue(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );

    const fd = new FormData();
    fd.append("file", new File(["x"], "car.jpg", { type: "image/jpeg" }));

    const res = await POST(
      new Request(
        "https://carshowscout.com/api/events/event-1/register-guest/upload",
        { method: "POST", body: fd },
      ),
      routeCtx(),
    );
    expect(res.status).toBe(429);
  });

  it("accepts a valid guest photo upload", async () => {
    const fd = new FormData();
    fd.append("file", new File(["data"], "car.jpg", { type: "image/jpeg" }));

    const res = await POST(
      new Request(
        "https://carshowscout.com/api/events/event-1/register-guest/upload",
        { method: "POST", body: fd },
      ),
      routeCtx(),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://cdn.example.com/vehicle.jpg");
  });
});
