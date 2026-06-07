import { defineArticle } from "./define-article";

export const cannotAccessEventDashboardArticle = defineArticle({
  id: "cannot-access-event-dashboard",
  slug: "cannot-access-event-dashboard",
  title: "I cannot access my event dashboard",
  shortDescription:
    "Restore organizer access when you cannot open event management pages.",
  audience: "ORGANIZER",
  category: "troubleshooting",
  keywords: ["organizer access", "permissions", "login", "staff role", "dashboard"],
  relatedWebsitePages: [
    "/dashboard/events",
    "/organizer/events/[id]/edit",
    "/organizer/verify-otp",
    "/login",
  ],
  relatedFeatures: ["organizer-access", "staff"],
  relatedArticleIds: ["create-and-publish-event", "assign-judges"],
  whoThisIsFor:
    "Event organizers or staff who expect to manage an event but cannot open organizer pages.",
  whatThisHelpsYouDo:
    "Sign in to the right account, confirm staff permissions, and complete any security steps blocking access.",
  beforeYouStart: [
    "Know which email address owns or manages the organization.",
    "Check whether you recently changed password or phone for security.",
  ],
  stepByStepInstructions: [
    {
      title: "Sign in with the correct account",
      body: "Use the email tied to your organizer or staff invitation. Personal registrant accounts without staff roles cannot manage events.",
    },
    {
      title: "Open Events you manage",
      body: "Go to Dashboard → Events and select the Managing tab. Your event should appear if you have access.",
    },
    {
      title: "Complete step-up verification if prompted",
      body: "Sensitive organizer pages may ask for a one-time code sent to your phone or email. Finish verification at the prompt.",
    },
    {
      title: "Confirm your staff role",
      body: "Ask the organization owner to verify you are on the event Staff list with an organizer or appropriate staff role.",
    },
    {
      title: "Contact the organization owner",
      body: "If you are a volunteer, the club admin may need to re-send access or add you to the organization.",
    },
  ],
  whatHappensNext:
    "Once access is restored, open the event from Dashboard → Events → Managing and continue setup from the organizer menu.",
  frequentlyAskedQuestions: [
    {
      question: "I created the event but cannot edit it now.",
      answer:
        "You may be signed into a different email than the one used to create the event. Sign out and sign back in with the original account.",
    },
    {
      question: "What is organizer verify OTP?",
      answer:
        "A security step for sensitive organizer actions. Enter the code sent to you to continue.",
    },
    {
      question: "I am staff but only see registrant dashboard.",
      answer:
        "Your staff role may not include organizer permissions. Ask the event chair to update your role on the Staff page.",
    },
  ],
  articleBody:
    "Organizer access is tied to your account and staff role. Most issues are wrong sign-in email, missing staff assignment, or an unfinished security verification.",
  chatbotSummary:
    "If organizer dashboard is inaccessible, sign in with the correct email, check Dashboard → Events → Managing, complete OTP step-up if prompted, and confirm staff role with the organization owner.",
  chatbotKeywords: [
    "cannot access organizer",
    "event dashboard",
    "organizer permissions",
    "staff access",
  ],
  sortOrder: 260,
});
