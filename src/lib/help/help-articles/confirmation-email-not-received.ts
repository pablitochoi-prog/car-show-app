import { defineArticle } from "./define-article";

export const confirmationEmailNotReceivedArticle = defineArticle({
  id: "confirmation-email-not-received",
  slug: "confirmation-email-not-received",
  title: "I did not receive my confirmation email",
  shortDescription:
    "Find your registration confirmation in your dashboard and fix common email delivery issues.",
  audience: "GENERAL",
  category: "troubleshooting",
  keywords: ["email", "confirmation", "spam", "registration", "receipt"],
  relatedWebsitePages: ["/dashboard/registrations", "/dashboard/events", "/login"],
  relatedFeatures: ["email", "registration"],
  relatedArticleIds: ["create-account", "register-for-event", "payment-did-not-go-through"],
  whoThisIsFor:
    "Anyone who registered for an event or created an account but did not get an expected email.",
  whatThisHelpsYouDo:
    "Confirm your registration succeeded and get the information you need even if email is delayed.",
  beforeYouStart: [
    "Wait a few minutes — emails can be delayed.",
    "Check that you signed up with the correct email address.",
  ],
  stepByStepInstructions: [
    {
      title: "Check spam and promotions folders",
      body: "Search for CarShowScout or the event name in all mail folders, including Spam, Junk, and Promotions.",
    },
    {
      title: "Sign in and open your dashboard",
      body: "Your registration is saved in CarShowScout even if email failed. Open Dashboard → Registrations or My Events to view confirmation.",
    },
    {
      title: "Verify the email on your account",
      body: "Open Profile and confirm your email address has no typos.",
    },
    {
      title: "Try resending if available",
      body: "Some flows offer resend confirmation. Use it once after checking spam.",
    },
    {
      title: "Contact the event organizer",
      body: "If you need a receipt for a paid registration, the organizer can confirm your payment from their registration list.",
    },
  ],
  whatHappensNext:
    "Once you can sign in and see the registration in your dashboard, you are registered. Add CarShowScout to your safe senders list for future mail.",
  frequentlyAskedQuestions: [
    {
      question: "Does no email mean I am not registered?",
      answer:
        "Not necessarily. Check your dashboard while signed in — that is the official record.",
    },
    {
      question: "I used the wrong email address.",
      answer:
        "Update your profile email or contact support or the organizer to merge or fix the registration.",
    },
    {
      question: "Paid registration but no receipt email?",
      answer:
        "Open your registration in the dashboard for payment status and contact the organizer with your name and vehicle if needed.",
    },
  ],
  articleBody:
    "Missing email is frustrating but usually fixable. Your dashboard confirmation is the best proof of registration while you sort out delivery.",
  chatbotSummary:
    "If no confirmation email, check spam, sign in to view registration in Dashboard → Registrations, verify profile email, resend if offered, and contact the organizer for paid receipts.",
  chatbotKeywords: [
    "no confirmation email",
    "missing email",
    "spam folder",
    "registration confirmation",
  ],
  sortOrder: 240,
});
