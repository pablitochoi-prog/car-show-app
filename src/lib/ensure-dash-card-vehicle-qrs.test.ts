import { afterEach, describe, expect, it, vi } from "vitest";

const resolveVoteQrMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/vehicle-qr", () => ({
  resolveVehicleQrUrlForDashCard: resolveVoteQrMock,
}));

import {
  DASH_CARD_QR_CONCURRENCY,
  ensureVehicleQrsForEntryCodes,
} from "./ensure-dash-card-vehicle-qrs";

describe("ensureVehicleQrsForEntryCodes", () => {
  afterEach(() => {
    resolveVoteQrMock.mockReset();
  });

  it("skips generation when prefetched vote QR URL exists", async () => {
    resolveVoteQrMock.mockResolvedValue("data:generated");

    const result = await ensureVehicleQrsForEntryCodes(["AXY-001", "AXY-002"], {
      prefetchedUrls: new Map([["AXY-001", "https://cdn.example/qr.svg"]]),
    });

    expect(result.qrByCode.get("AXY-001")).toBe("https://cdn.example/qr.svg");
    expect(result.qrSkippedCount).toBe(1);
    expect(result.qrEnsuredCount).toBe(1);
    expect(result.qrFailureCount).toBe(0);
    expect(resolveVoteQrMock).toHaveBeenCalledTimes(1);
    expect(resolveVoteQrMock).toHaveBeenCalledWith(null, "AXY-002");
  });

  it("generates inline vote QR when no prefetched URL", async () => {
    resolveVoteQrMock.mockResolvedValue("data:image/svg+xml;base64,abc");

    const result = await ensureVehicleQrsForEntryCodes(["AXY-003"]);

    expect(result.qrByCode.get("AXY-003")).toBe("data:image/svg+xml;base64,abc");
    expect(result.qrEnsuredCount).toBe(1);
    expect(result.qrSkippedCount).toBe(0);
    expect(result.qrFailureCount).toBe(0);
  });

  it("continues when individual vote QR resolution fails", async () => {
    resolveVoteQrMock
      .mockRejectedValueOnce(new Error("svg failed"))
      .mockResolvedValueOnce("data:ok");

    const result = await ensureVehicleQrsForEntryCodes(["BAD-001", "AXY-004"]);

    expect(result.qrFailureCount).toBe(1);
    expect(result.qrEnsuredCount).toBe(1);
    expect(result.qrByCode.get("AXY-004")).toBe("data:ok");
    expect(result.qrByCode.has("BAD-001")).toBe(false);
  });

  it("deduplicates codes before processing", async () => {
    resolveVoteQrMock.mockResolvedValue("data:dup");

    const result = await ensureVehicleQrsForEntryCodes([
      "AXY-005",
      "AXY-005",
      "AXY-005",
    ]);

    expect(result.qrEnsuredCount).toBe(1);
    expect(resolveVoteQrMock).toHaveBeenCalledTimes(1);
    expect(result.qrByCode.size).toBe(1);
  });

  it("processes vote QRs with bounded concurrency", async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    resolveVoteQrMock.mockImplementation(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 20));
      inFlight--;
      return "data:batch";
    });

    const codes = Array.from({ length: 24 }, (_, i) => `AXY-${String(i).padStart(3, "0")}`);
    await ensureVehicleQrsForEntryCodes(codes);

    expect(maxInFlight).toBeLessThanOrEqual(DASH_CARD_QR_CONCURRENCY);
    expect(maxInFlight).toBeGreaterThan(1);
  });
});
