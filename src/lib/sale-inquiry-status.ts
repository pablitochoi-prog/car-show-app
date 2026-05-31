import type { VehicleSaleInquiryStatus } from "@prisma/client";

const STATUS_LABELS: Record<VehicleSaleInquiryStatus, string> = {
  NEW: "New",
  SENT_TO_OWNER: "Sent",
  FAILED_TO_SEND: "Delivery failed",
  SPAM: "Spam",
  ARCHIVED: "Archived",
  CONTACTED: "Contacted",
};

export function saleInquiryStatusLabel(status: string): string {
  return STATUS_LABELS[status as VehicleSaleInquiryStatus] ?? status;
}

export function saleInquiryStatusVariant(
  status: string,
): "default" | "secondary" | "danger" | "outline" | "muted" {
  switch (status) {
    case "NEW":
      return "default";
    case "SENT_TO_OWNER":
    case "CONTACTED":
      return "secondary";
    case "FAILED_TO_SEND":
      return "danger";
    default:
      return "outline";
  }
}

export function saleInquiryNeedsAttention(status: string): boolean {
  return status === "NEW" || status === "SENT_TO_OWNER";
}
