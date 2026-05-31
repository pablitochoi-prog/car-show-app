import { createHash } from "crypto";

/** Truncated SHA-256 for IP / user-agent storage — never store raw values. */
export function hashSaleInquiryClientValue(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}
