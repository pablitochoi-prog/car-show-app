import { z } from "zod";

export const vehicleManualAwardWriteSchema = z.object({
  awardName: z
    .string()
    .trim()
    .min(1, "Award name is required.")
    .max(200, "Award name is too long."),
  eventName: z
    .string()
    .trim()
    .min(1, "Event name is required.")
    .max(200, "Event name is too long."),
  eventDate: z
    .string()
    .trim()
    .min(1, "Event date is required.")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid event date."),
  organizationName: z
    .string()
    .trim()
    .max(200, "Organization name is too long.")
    .optional()
    .nullable(),
});

export type VehicleManualAwardWriteInput = z.infer<
  typeof vehicleManualAwardWriteSchema
>;

export function parseEventDateInput(isoDate: string): Date {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid event date.");
  }
  return d;
}
