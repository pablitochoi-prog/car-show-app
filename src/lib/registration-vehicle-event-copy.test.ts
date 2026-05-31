import { describe, expect, it } from "vitest";
import {
  applyRegistrationVehicleEventCopyFromRegistration,
  normalizeRegistrationVehicleCopy,
  resolveRegistrationVehicleNickname,
  resolveRegistrationVehicleStory,
} from "./registration-vehicle-event-copy";

describe("resolveRegistrationVehicleNickname", () => {
  it("prefers event-specific nickname over garage", () => {
    expect(resolveRegistrationVehicleNickname("Show Name", "Garage Name")).toBe(
      "Show Name",
    );
  });

  it("falls back to garage when event nickname is empty", () => {
    expect(resolveRegistrationVehicleNickname(null, "Garage Name")).toBe(
      "Garage Name",
    );
  });
});

describe("resolveRegistrationVehicleStory", () => {
  it("prefers event-specific story over garage notes", () => {
    expect(
      resolveRegistrationVehicleStory("Event story", "Garage story"),
    ).toBe("Event story");
  });

  it("falls back to garage notes when event story is empty", () => {
    expect(resolveRegistrationVehicleStory("", "Garage story")).toBe(
      "Garage story",
    );
  });
});

describe("normalizeRegistrationVehicleCopy", () => {
  it("trims and nulls empty strings", () => {
    expect(normalizeRegistrationVehicleCopy("  hello  ")).toBe("hello");
    expect(normalizeRegistrationVehicleCopy("   ")).toBeNull();
  });
});

describe("applyRegistrationVehicleEventCopyFromRegistration", () => {
  it("updates RegistrationVehicle rows without touching garage vehicles", async () => {
    const updates: Array<{
      registrationId: string;
      vehicleId: string;
      data: Record<string, string | null>;
    }> = [];

    const tx = {
      registrationVehicle: {
        updateMany: async ({
          where,
          data,
        }: {
          where: { registrationId: string; vehicleId: string };
          data: Record<string, string | null>;
        }) => {
          updates.push({ ...where, data });
          return { count: 1 };
        },
      },
    };

    await applyRegistrationVehicleEventCopyFromRegistration(
      tx as never,
      "reg-1",
      ["vehicle-1"],
      { "vehicle-1": " Green Machine " },
      { "vehicle-1": "First show since restoration." },
    );

    expect(updates).toEqual([
      {
        registrationId: "reg-1",
        vehicleId: "vehicle-1",
        data: {
          vehicleNickname: "Green Machine",
          vehicleStory: "First show since restoration.",
        },
      },
    ]);
  });
});
