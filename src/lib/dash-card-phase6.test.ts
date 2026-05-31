import { afterEach, describe, expect, it, vi } from "vitest";

const resolveSaleQrMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/vehicle-qr", () => ({
  resolveVehicleSaleQrUrlForDashCard: resolveSaleQrMock,
}));

import { attachSaleQrsToDashCards } from "./dash-card-sale";

describe("attachSaleQrsToDashCards", () => {
  afterEach(() => {
    resolveSaleQrMock.mockReset();
  });

  it("attaches inline sale QR URLs without R2 upload helper", async () => {
    resolveSaleQrMock.mockResolvedValue("data:sale-qr");
    const applied = new Map<string, string>();

    const result = await attachSaleQrsToDashCards(
      [
        {
          vehicleEntryCode: "AXY-010",
          eventId: "evt-1",
          storageId: "rv-1",
        },
      ],
      (code, url) => {
        applied.set(code, url);
      },
    );

    expect(result.saleQrEnsuredCount).toBe(1);
    expect(result.saleQrFailureCount).toBe(0);
    expect(applied.get("AXY-010")).toBe("data:sale-qr");
    expect(resolveSaleQrMock).toHaveBeenCalledWith("AXY-010");
  });

  it("does not fail entire batch when one sale QR fails", async () => {
    resolveSaleQrMock
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce("data:ok");

    const applied = new Map<string, string>();
    const result = await attachSaleQrsToDashCards(
      [
        {
          vehicleEntryCode: "BAD-010",
          eventId: "evt-1",
          storageId: "rv-bad",
        },
        {
          vehicleEntryCode: "AXY-011",
          eventId: "evt-1",
          storageId: "rv-2",
        },
      ],
      (code, url) => {
        applied.set(code, url);
      },
    );

    expect(result.saleQrFailureCount).toBe(1);
    expect(result.saleQrEnsuredCount).toBe(1);
    expect(applied.get("AXY-011")).toBe("data:ok");
    expect(applied.has("BAD-010")).toBe(false);
  });
});

describe("dash-cards loader staff photo sync", () => {
  it("does not import eager staff-photo sync in dash-card loader module", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(
        new URL("./dash-cards-for-registrations.ts", import.meta.url),
        "utf8",
      ),
    );
    expect(source).not.toContain("syncAllRegistrationStaffPhotos");
  });
});
