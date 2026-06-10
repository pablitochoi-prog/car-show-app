import { describe, expect, it, vi, beforeAll, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  requireOrgOwner: vi.fn(),
  resolveStripeAppOrigin: vi.fn(),
  syncAccountStatus: vi.fn(),
  organizationFindUnique: vi.fn(),
  logObservabilityError: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: h.getCurrentUser,
  requireOrgOwner: h.requireOrgOwner,
}));
vi.mock("@/lib/stripe-connect", () => ({
  resolveStripeAppOrigin: h.resolveStripeAppOrigin,
  syncAccountStatus: h.syncAccountStatus,
}));
vi.mock("@/lib/db", () => ({
  prisma: { organization: { findUnique: h.organizationFindUnique } },
}));
vi.mock("@/lib/structured-logging", () => ({
  logObservabilityError: h.logObservabilityError,
}));

const ORIGIN = "https://carshowscout.com";

let GET: (request: Request) => Promise<Response>;

beforeAll(async () => {
  ({ GET } = await import("./route"));
});

beforeEach(() => {
  vi.clearAllMocks();
  // By default resolveStripeAppOrigin passes through the origin unchanged.
  h.resolveStripeAppOrigin.mockImplementation((origin: string) => origin);
});

function makeRequest(params: Record<string, string> = {}): Request {
  const url = new URL(`${ORIGIN}/api/stripe/connect/return`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url);
}

function redirectLocation(res: Response): string {
  return res.headers.get("location") ?? "";
}

describe("stripe/connect/return — authorization", () => {
  it("redirects to /dashboard/clubs when orgId is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(redirectLocation(res)).toContain("/dashboard/clubs");
  });

  it("redirects to /login for unauthenticated requests", async () => {
    h.getCurrentUser.mockResolvedValue(null);
    const res = await GET(makeRequest({ orgId: "org-1" }));
    expect(res.status).toBeGreaterThanOrEqual(300);
    const loc = redirectLocation(res);
    expect(loc).toContain("/login");
    // The redirect URL should carry back the original return path
    expect(loc).toContain("redirect");
  });

  it("redirects to /dashboard/clubs when user is not the org owner", async () => {
    h.getCurrentUser.mockResolvedValue({ id: "user-1", platformRole: "USER" });
    h.requireOrgOwner.mockRejectedValue(new Error("Not owner"));
    const res = await GET(makeRequest({ orgId: "org-1" }));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(redirectLocation(res)).toContain("/dashboard/clubs");
  });

  it("redirects to /dashboard/clubs when org has no Stripe account", async () => {
    h.getCurrentUser.mockResolvedValue({ id: "owner-1", platformRole: "USER" });
    h.requireOrgOwner.mockResolvedValue(undefined);
    h.organizationFindUnique.mockResolvedValue({ stripeAccountId: null });
    const res = await GET(makeRequest({ orgId: "org-1" }));
    expect(redirectLocation(res)).toContain("/dashboard/clubs");
  });

  it("redirects to /dashboard/stripe/return with stripe=active on successful sync", async () => {
    h.getCurrentUser.mockResolvedValue({ id: "owner-1", platformRole: "USER" });
    h.requireOrgOwner.mockResolvedValue(undefined);
    h.organizationFindUnique.mockResolvedValue({ stripeAccountId: "acct_123" });
    h.syncAccountStatus.mockResolvedValue({
      sync: {
        stripeChargesEnabled: true,
        stripeDetailsSubmitted: true,
        pendingReview: false,
      },
    });

    const res = await GET(makeRequest({ orgId: "org-1" }));
    expect(res.status).toBeGreaterThanOrEqual(300);
    const loc = redirectLocation(res);
    expect(loc).toContain("stripe=active");
    expect(loc).toContain("orgId=org-1");
  });

  it("still redirects (with stripe=error) when Stripe sync throws, and logs the error", async () => {
    h.getCurrentUser.mockResolvedValue({ id: "owner-1", platformRole: "USER" });
    h.requireOrgOwner.mockResolvedValue(undefined);
    h.organizationFindUnique.mockResolvedValue({ stripeAccountId: "acct_456" });
    h.syncAccountStatus.mockRejectedValue(new Error("Stripe API timeout"));

    const res = await GET(makeRequest({ orgId: "org-1" }));
    const loc = redirectLocation(res);
    expect(loc).toContain("stripe=error");
    // Logs instead of crashing
    expect(h.logObservabilityError).toHaveBeenCalledWith(
      expect.objectContaining({ source: "stripe.connect.return.sync" }),
    );
  });

  it("idempotent: repeated calls for the same owner do not throw", async () => {
    h.getCurrentUser.mockResolvedValue({ id: "owner-1", platformRole: "USER" });
    h.requireOrgOwner.mockResolvedValue(undefined);
    h.organizationFindUnique.mockResolvedValue({ stripeAccountId: "acct_123" });
    h.syncAccountStatus.mockResolvedValue({
      sync: {
        stripeChargesEnabled: true,
        stripeDetailsSubmitted: true,
        pendingReview: false,
      },
    });

    const res1 = await GET(makeRequest({ orgId: "org-1" }));
    const res2 = await GET(makeRequest({ orgId: "org-1" }));
    expect(redirectLocation(res1)).toContain("stripe=active");
    expect(redirectLocation(res2)).toContain("stripe=active");
  });
});
