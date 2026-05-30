import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VehicleEntryRecord } from "@/lib/vehicle-entry-types";

const cookieStore = {
  get: vi.fn(),
  set: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    vehiclePublicVote: {
      findUnique: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
    },
    event: {
      findUnique: vi.fn(async () => null),
    },
    votingCategory: {
      findMany: vi.fn(async () => []),
    },
  },
}));

import {
  VOTE_FINGERPRINT_COOKIE,
  buildEventVisitorKey,
  getOrCreateVoterKey,
  getVisitorPublicVoteContext,
  readVoterFingerprint,
} from "@/lib/vehicle-voting";

const sampleEntry = {
  eventId: "evt-1",
  vehicleEntryCode: "AXY-004",
} as VehicleEntryRecord;

describe("vehicle-voting fingerprint", () => {
  beforeEach(() => {
    cookieStore.get.mockReset();
    cookieStore.set.mockReset();
  });

  it("readVoterFingerprint returns null when cookie is missing", async () => {
    cookieStore.get.mockReturnValue(undefined);
    await expect(readVoterFingerprint()).resolves.toBeNull();
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("readVoterFingerprint returns existing cookie without writing", async () => {
    cookieStore.get.mockReturnValue({ value: "fp-abc" });
    await expect(readVoterFingerprint()).resolves.toBe("fp-abc");
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("getOrCreateVoterKey sets cookie only in route-handler context", async () => {
    cookieStore.get.mockReturnValue(undefined);
    const fp = await getOrCreateVoterKey();
    expect(fp).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(cookieStore.set).toHaveBeenCalledWith(
      VOTE_FINGERPRINT_COOKIE,
      fp,
      expect.objectContaining({ httpOnly: true, path: "/" }),
    );
  });

  it("getVisitorPublicVoteContext is safe without fingerprint", async () => {
    cookieStore.get.mockReturnValue(undefined);
    const ctx = await getVisitorPublicVoteContext(sampleEntry, null);
    expect(ctx.votedCategoryIdOnVehicle).toBeNull();
    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});

describe("buildEventVisitorKey", () => {
  it("is scoped to the event, not the vehicle", () => {
    const a = buildEventVisitorKey("fp-1", "evt-1");
    const b = buildEventVisitorKey("fp-1", "evt-1");
    const otherEvent = buildEventVisitorKey("fp-1", "evt-2");
    expect(a).toBe(b);
    expect(a).not.toBe(otherEvent);
  });
});
