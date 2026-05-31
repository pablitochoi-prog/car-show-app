import { describe, expect, it } from "vitest";
import {
  getSmsBuyerInquiryDisclosurePlainText,
  getSmsFullDisclosurePlainText,
  SMS_CONSENT_LINK_LABELS,
  smsDisclosureIncludesRequiredPhrases,
} from "@/lib/sms-notifications-disclosure-content";

describe("SMS first-time consent disclosure copy", () => {
  it("full registration disclosure includes required TCPA phrases and link labels", () => {
    const text = getSmsFullDisclosurePlainText();
    expect(smsDisclosureIncludesRequiredPhrases(text)).toBe(true);
    expect(text).toContain(SMS_CONSENT_LINK_LABELS.terms);
    expect(text).toContain(SMS_CONSENT_LINK_LABELS.privacyPolicy);
    expect(text).toContain("CarShowScout");
  });

  it("compact buyer-inquiry disclosure includes required TCPA phrases and link labels", () => {
    const text = getSmsBuyerInquiryDisclosurePlainText();
    expect(smsDisclosureIncludesRequiredPhrases(text)).toBe(true);
    expect(text).toContain(SMS_CONSENT_LINK_LABELS.terms);
    expect(text).toContain(SMS_CONSENT_LINK_LABELS.privacyPolicy);
  });
});
