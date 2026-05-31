import { describe, expect, it } from "vitest";
import { applyVehicleVinsFromRegistration } from "@/lib/registration-vehicle-vins";

describe("applyVehicleVinsFromRegistration", () => {
  it("updates VIN on owned vehicles when provided", async () => {
    const updates: { id: string; vin: string | null }[] = [];
    const tx = {
      vehicle: {
        updateMany: async ({
          where,
          data,
        }: {
          where: { id: string; userId: string };
          data: { vin: string | null };
        }) => {
          updates.push({ id: where.id, vin: data.vin });
          return { count: 1 };
        },
      },
    };

    await applyVehicleVinsFromRegistration(
      tx as never,
      "user-1",
      ["veh-1", "veh-2"],
      {
        "veh-1": " 1hg bh41jxmn109186 ",
        "veh-2": "",
      },
    );

    expect(updates).toEqual([
      { id: "veh-1", vin: "1HGBH41JXMN109186" },
      { id: "veh-2", vin: null },
    ]);
  });
});
