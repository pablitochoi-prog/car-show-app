import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {},
}));

vi.mock("@/lib/r2", () => ({
  buildPublicPhotoUrl: (key: string) => `https://cdn.example/${key}`,
}));

vi.mock("@/lib/storage/public-photos", () => ({
  uploadPublicPhoto: vi.fn(),
}));

vi.mock("qrcode", () => ({
  default: {
    toString: vi.fn().mockResolvedValue("<svg/>"),
  },
}));

import {
  resolveVehicleQrUrlForDashCard,
  vehicleQrObjectKey,
  vehicleQrStorageId,
} from "./vehicle-qr";

describe("resolveVehicleQrUrlForDashCard", () => {
  it("reuses persisted vote QR URL when object key matches", async () => {
    const entry = {
      eventId: "evt-1",
      vehicleEntryCode: "AXY-012",
      registrationVehicleId: "rv-12",
      registrationId: "reg-12",
      vehicleQrObjectKey: vehicleQrObjectKey(
        "evt-1",
        vehicleQrStorageId({
          registrationVehicleId: "rv-12",
          registrationId: "reg-12",
          vehicleEntryCode: "AXY-012",
        }),
      ),
      vehicleQrUrl: "https://cdn.example/persisted.svg",
    };

    const url = await resolveVehicleQrUrlForDashCard(entry, "AXY-012");
    expect(url).toBe("https://cdn.example/persisted.svg");
  });

  it("generates inline SVG when no persisted vote QR URL", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://carshowscout.com";
    const url = await resolveVehicleQrUrlForDashCard(null, "AXY-013");
    expect(url.startsWith("data:image/svg+xml;base64,")).toBe(true);
  });
});
