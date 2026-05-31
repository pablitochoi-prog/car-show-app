import { describe, expect, it } from "vitest";
import {
  registrationSmsCheckboxDefault,
  shouldShowBuyerInquiryDialogSmsOptIn,
  shouldShowRegistrationFullSmsDisclosure,
  shouldUpdateUserProfileSmsOnInquirySubmit,
  shouldUpdateUserProfileSmsOnRegistrationSubmit,
  validateBuyerInquiryDialogSmsOptInRequiresPhone,
  validateSmsOptInRequiresPhone,
} from "@/lib/sms-notifications-consent-ui";

describe("registrationSmsCheckboxDefault", () => {
  it("defaults checked when profile has active SMS opt-in", () => {
    expect(registrationSmsCheckboxDefault(true)).toBe(true);
  });

  it("defaults unchecked when profile has no active opt-in", () => {
    expect(registrationSmsCheckboxDefault(false)).toBe(false);
  });
});

describe("shouldShowRegistrationFullSmsDisclosure", () => {
  it("shows full disclosure when not opted in at profile", () => {
    expect(shouldShowRegistrationFullSmsDisclosure(false)).toBe(true);
  });

  it("hides full disclosure when already opted in at profile", () => {
    expect(shouldShowRegistrationFullSmsDisclosure(true)).toBe(false);
  });
});

describe("shouldShowBuyerInquiryDialogSmsOptIn", () => {
  it("shows for logged-in users without profile opt-in", () => {
    expect(
      shouldShowBuyerInquiryDialogSmsOptIn({
        showSmsOptIn: true,
        profileSmsOptInActive: false,
        hasOptInChangeHandler: true,
      }),
    ).toBe(true);
  });

  it("hides when profile already has active SMS opt-in", () => {
    expect(
      shouldShowBuyerInquiryDialogSmsOptIn({
        showSmsOptIn: true,
        profileSmsOptInActive: true,
        hasOptInChangeHandler: true,
      }),
    ).toBe(false);
  });

  it("hides for guests (showSmsOptIn false)", () => {
    expect(
      shouldShowBuyerInquiryDialogSmsOptIn({
        showSmsOptIn: false,
        profileSmsOptInActive: false,
        hasOptInChangeHandler: true,
      }),
    ).toBe(false);
  });

  it("hides when no opt-in change handler (guest dialog)", () => {
    expect(
      shouldShowBuyerInquiryDialogSmsOptIn({
        showSmsOptIn: true,
        profileSmsOptInActive: false,
        hasOptInChangeHandler: false,
      }),
    ).toBe(false);
  });
});

describe("shouldUpdateUserProfileSmsOnRegistrationSubmit", () => {
  it("updates profile when logged-in user opts in on registration", () => {
    expect(
      shouldUpdateUserProfileSmsOnRegistrationSubmit({
        isLoggedIn: true,
        smsNotificationsOptIn: true,
      }),
    ).toBe(true);
  });

  it("skips profile update when SMS unchecked", () => {
    expect(
      shouldUpdateUserProfileSmsOnRegistrationSubmit({
        isLoggedIn: true,
        smsNotificationsOptIn: false,
      }),
    ).toBe(false);
  });

  it("skips profile update for guests even when SMS checked", () => {
    expect(
      shouldUpdateUserProfileSmsOnRegistrationSubmit({
        isLoggedIn: false,
        smsNotificationsOptIn: true,
      }),
    ).toBe(false);
  });
});

describe("shouldUpdateUserProfileSmsOnInquirySubmit", () => {
  it("updates profile for authenticated inquiry with SMS opt-in", () => {
    expect(
      shouldUpdateUserProfileSmsOnInquirySubmit({
        currentUserId: "user-1",
        smsNotificationsOptIn: true,
      }),
    ).toBe(true);
  });

  it("skips profile update for anonymous inquiry", () => {
    expect(
      shouldUpdateUserProfileSmsOnInquirySubmit({
        currentUserId: null,
        smsNotificationsOptIn: true,
      }),
    ).toBe(false);
  });
});

describe("validateSmsOptInRequiresPhone", () => {
  it("requires phone when SMS opt-in is checked", () => {
    expect(
      validateSmsOptInRequiresPhone({
        smsNotificationsOptIn: true,
        phone: "",
      }),
    ).toBe("Enter a phone number to receive SMS notifications.");
  });

  it("allows unchecked SMS without phone", () => {
    expect(
      validateSmsOptInRequiresPhone({
        smsNotificationsOptIn: false,
        phone: "",
      }),
    ).toBeNull();
  });
});

describe("validateBuyerInquiryDialogSmsOptInRequiresPhone", () => {
  it("requires contact phone when dialog SMS section is visible and checked", () => {
    expect(
      validateBuyerInquiryDialogSmsOptInRequiresPhone({
        smsSectionVisible: true,
        smsNotificationsOptIn: true,
        contactPhone: "  ",
      }),
    ).toBe(
      "Add a phone number in Contact Information before opting in to SMS alerts.",
    );
  });

  it("allows save when SMS section is hidden", () => {
    expect(
      validateBuyerInquiryDialogSmsOptInRequiresPhone({
        smsSectionVisible: false,
        smsNotificationsOptIn: true,
        contactPhone: "",
      }),
    ).toBeNull();
  });
});
