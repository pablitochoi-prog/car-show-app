import { describe, expect, it } from "vitest";
import {
  extractEventIdFromPath,
  isSensitiveOrganizerPagePath,
  isSensitiveEventApiPath,
  isSensitiveMessagesApiPath,
  isSensitiveStaffPath,
  isStepUpExemptPath,
} from "./organizer-step-up-policy";

describe("extractEventIdFromPath", () => {
  it("extracts from organizer and API paths", () => {
    expect(extractEventIdFromPath("/organizer/events/abc-123/edit")).toBe(
      "abc-123",
    );
    expect(extractEventIdFromPath("/api/events/xyz/registrations")).toBe("xyz");
  });
});

describe("isSensitiveOrganizerPagePath", () => {
  it("gates edit, registrations, reports, messages", () => {
    expect(isSensitiveOrganizerPagePath("/organizer/events/e1/edit")).toBe(true);
    expect(
      isSensitiveOrganizerPagePath("/organizer/events/e1/registrations"),
    ).toBe(true);
    expect(
      isSensitiveOrganizerPagePath(
        "/organizer/events/e1/registrations/r1",
      ),
    ).toBe(true);
    expect(isSensitiveOrganizerPagePath("/organizer/events/e1/reports")).toBe(
      true,
    );
    expect(isSensitiveOrganizerPagePath("/organizer/events/e1/messages")).toBe(
      true,
    );
  });

  it("does not gate verify-otp, new, or event hub", () => {
    expect(isSensitiveOrganizerPagePath("/organizer/verify-otp")).toBe(false);
    expect(isSensitiveOrganizerPagePath("/organizer/events/new")).toBe(false);
    expect(isSensitiveOrganizerPagePath("/organizer/events/e1")).toBe(false);
    expect(isSensitiveOrganizerPagePath("/organizer/events/e1/staff")).toBe(
      false,
    );
  });
});

describe("isSensitiveEventApiPath", () => {
  it("gates registration and management APIs", () => {
    expect(
      isSensitiveEventApiPath("/api/events/e1/registrations", "GET"),
    ).toBe(true);
    expect(isSensitiveEventApiPath("/api/events/e1/payment-settings", "GET")).toBe(
      true,
    );
  });

  it("allows public registration endpoints", () => {
    expect(isSensitiveEventApiPath("/api/events/e1/register", "POST")).toBe(
      false,
    );
    expect(
      isSensitiveEventApiPath("/api/events/e1/available-categories", "GET"),
    ).toBe(false);
  });
});

describe("isSensitiveMessagesApiPath", () => {
  it("gates organizer-scoped messages", () => {
    const params = new URLSearchParams("role=organizer&eventId=e1");
    expect(isSensitiveMessagesApiPath("/api/messages", params)).toBe(true);
    expect(isSensitiveMessagesApiPath("/api/messages/unread-count", params)).toBe(
      false,
    );
    expect(isSensitiveMessagesApiPath("/api/messages/abc", params)).toBe(true);
  });
});

describe("isStepUpExemptPath", () => {
  it("exempts OTP and auth routes", () => {
    expect(isStepUpExemptPath("/organizer/verify-otp")).toBe(true);
    expect(isStepUpExemptPath("/api/organizer/otp/send")).toBe(true);
    expect(isStepUpExemptPath("/login")).toBe(true);
  });
});

describe("isSensitiveStaffPath", () => {
  it("combines page and API matchers", () => {
    expect(
      isSensitiveStaffPath("/organizer/events/e1/edit", "GET"),
    ).toBe(true);
    expect(
      isSensitiveStaffPath("/api/events/e1/registrations", "GET"),
    ).toBe(true);
    expect(isSensitiveStaffPath("/organizer/verify-otp", "GET")).toBe(false);
  });
});
