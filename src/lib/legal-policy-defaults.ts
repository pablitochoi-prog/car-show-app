import { sanitizePolicyHtml } from "@/lib/sanitize-policy-html";

/** Default SMS notice shown in the admin editor before first publish. */
export const DEFAULT_SMS_TEXT_POLICY_HTML = sanitizePolicyHtml(
  "<p>By texting an event code to CarShowScout or providing your phone number during event registration, you agree to receive SMS messages related to car show event voting, registration, and event participation. Message and data rates may apply. Message frequency varies by event. Reply STOP to opt out. Reply HELP for help.</p>",
);
