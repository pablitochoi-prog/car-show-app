import { describe, expect, it } from "vitest";
import { buildPromoCodesCsv, promoCodeToCsvRow } from "./promo-code-csv";

const sampleRow = {
  id: "p1",
  code: "ABCD1234EFGH5678",
  status: "REDEEMED" as const,
  expiresAt: null,
  internalNotes: "note",
  reservedOrganizationName: null,
  reservedEventName: null,
  reservedEventState: null,
  redeemedAt: new Date("2026-06-08T12:30:00.000Z"),
  redeemedByUserId: "u1",
  redeemedEventId: "e1",
  redeemedOrganizationName: "PCA New Jersey",
  redeemedEventName: "PCA Porsche Parade",
  redeemedEventState: "NY",
  createdByUserId: null,
  updatedByUserId: null,
  createdAt: new Date("2026-06-01T10:00:00.000Z"),
  updatedAt: new Date("2026-06-08T12:30:00.000Z"),
  redeemedBy: {
    email: "admin@example.com",
    firstName: "Pablo",
    lastName: "Choi",
  },
};

describe("promo code CSV export", () => {
  it("includes headers and ISO timestamps", () => {
    const csv = buildPromoCodesCsv([sampleRow]);
    expect(csv).toContain("Promo code,Status,Created,Modified");
    expect(csv).toContain("Redeemed date/time");
    expect(csv).toContain("ABCD-1234-EFGH5678");
    expect(csv).toContain("2026-06-08T12:30:00.000Z");
    expect(csv).toContain("PCA New Jersey");
  });

  it("escapes commas in notes", () => {
    const row = promoCodeToCsvRow({
      ...sampleRow,
      internalNotes: 'note, with comma',
    });
    expect(row).toContain('"note, with comma"');
  });
});
