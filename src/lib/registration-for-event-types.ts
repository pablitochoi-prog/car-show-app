import type { RegistrationContact } from "@/lib/registration-contact";

/** Serialized registration state for the public event registration UI. */
export type ExistingRegistrationForEvent = {
  id: string;
  tierId: string;
  vehicleIds: string[];
  vehicleCategories: Record<string, string>;
  /** Map vehicleId → public show id (e.g. AXY-004) for this event. */
  vehiclePublicIds: Record<string, string>;
  contact: RegistrationContact;
  paymentStatus: string | null;
  registrationStatus: string;
  /** Chosen donation in cents (DONATION fee type). */
  amountCents: number | null;
  platformFeeCents: number | null;
  refundedCents: number;
};
