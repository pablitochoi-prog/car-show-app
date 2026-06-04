import { describe, expect, it } from "vitest";
import { vehicleManualAwardWriteSchema } from "@/lib/validation/vehicle-manual-award";

describe("vehicleManualAwardWriteSchema", () => {
  it("accepts a valid manual award payload", () => {
    const result = vehicleManualAwardWriteSchema.safeParse({
      awardName: "Best in Show",
      eventName: "Local Cruise 2024",
      eventDate: "2024-06-15",
      organizationName: "Classic Car Club",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing award name", () => {
    const result = vehicleManualAwardWriteSchema.safeParse({
      awardName: "",
      eventName: "Show",
      eventDate: "2024-06-15",
    });
    expect(result.success).toBe(false);
  });
});
