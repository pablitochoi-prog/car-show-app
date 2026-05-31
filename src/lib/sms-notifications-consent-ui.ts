/** Default SMS checkbox on event registration when profile already has active consent. */
export function registrationSmsCheckboxDefault(
  profileHasActiveOptIn: boolean,
): boolean {
  return profileHasActiveOptIn;
}

/** Show full TCPA disclosure on registration when profile has not already opted in. */
export function shouldShowRegistrationFullSmsDisclosure(
  alreadyOptedInAtProfile: boolean,
): boolean {
  return !alreadyOptedInAtProfile;
}

/** Compact buyer-inquiry SMS opt-in in the registration dialog (logged-in, not yet opted in). */
export function shouldShowBuyerInquiryDialogSmsOptIn(args: {
  showSmsOptIn: boolean;
  profileSmsOptInActive: boolean;
  hasOptInChangeHandler: boolean;
}): boolean {
  return (
    args.showSmsOptIn &&
    !args.profileSmsOptInActive &&
    args.hasOptInChangeHandler
  );
}

/** POST /api/events/[id]/register updates User SMS fields only for logged-in opt-in. */
export function shouldUpdateUserProfileSmsOnRegistrationSubmit(args: {
  isLoggedIn: boolean;
  smsNotificationsOptIn: boolean;
}): boolean {
  return args.isLoggedIn && args.smsNotificationsOptIn;
}

/** Buyer inquiry API updates User SMS fields only when a profile exists and opt-in is checked. */
export function shouldUpdateUserProfileSmsOnInquirySubmit(args: {
  currentUserId: string | null | undefined;
  smsNotificationsOptIn: boolean;
}): boolean {
  return Boolean(args.currentUserId) && args.smsNotificationsOptIn;
}

/** Client-side guard shared by registration and buyer-inquiry dialog. */
export function validateSmsOptInRequiresPhone(args: {
  smsNotificationsOptIn: boolean;
  phone: string | null | undefined;
}): string | null {
  if (args.smsNotificationsOptIn && !args.phone?.trim()) {
    return "Enter a phone number to receive SMS notifications.";
  }
  return null;
}

/** Buyer inquiry dialog uses a slightly different message when phone is missing. */
export function validateBuyerInquiryDialogSmsOptInRequiresPhone(args: {
  smsSectionVisible: boolean;
  smsNotificationsOptIn: boolean;
  contactPhone: string | null | undefined;
}): string | null {
  if (
    args.smsSectionVisible &&
    args.smsNotificationsOptIn &&
    !args.contactPhone?.trim()
  ) {
    return "Add a phone number in Contact Information before opting in to SMS alerts.";
  }
  return null;
}
