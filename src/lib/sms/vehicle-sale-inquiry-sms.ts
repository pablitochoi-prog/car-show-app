export type VehicleSaleInquirySmsInput = {
  inquiryId: string;
  sellerPhone: string | null;
  vehicleEntryCode: string;
  buyerName: string;
};

export type VehicleSaleInquirySmsResult =
  | { sent: true }
  | { sent: false; skipped: true; reason: string };

/** Placeholder until Twilio outbound is approved for seller notifications. */
export async function notifyVehicleSaleInquirySms(
  input: VehicleSaleInquirySmsInput,
): Promise<VehicleSaleInquirySmsResult> {
  if (process.env.TWILIO_SMS_OUTBOUND_ENABLED?.trim() !== "1") {
    return {
      sent: false,
      skipped: true,
      reason: "TWILIO_SMS_OUTBOUND_ENABLED is not set to 1.",
    };
  }

  if (!input.sellerPhone?.trim()) {
    return {
      sent: false,
      skipped: true,
      reason: "Seller phone not available.",
    };
  }

  console.warn(
    "[vehicle-sale-inquiry-sms] outbound enabled but SMS delivery is not implemented yet.",
    input.inquiryId,
  );
  return {
    sent: false,
    skipped: true,
    reason: "SMS notifications are not implemented yet.",
  };
}
