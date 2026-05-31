import { z } from "zod";

export const eventVehicleSaleSettingsSchema = z.object({
  vehicleSaleInquiriesEnabled: z.boolean(),
});

export type EventVehicleSaleSettingsInput = z.infer<
  typeof eventVehicleSaleSettingsSchema
>;
