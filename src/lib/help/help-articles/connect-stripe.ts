import { defineArticle } from "./define-article";

export const connectStripeArticle = defineArticle({
  id: "connect-stripe",
  slug: "connect-stripe",
  title: "How to connect Stripe for event payments",
  shortDescription:
    "Link Stripe so your event can accept registration payments and receive payouts to your organization.",
  audience: "ORGANIZER",
  category: "stripe-setup",
  keywords: ["Stripe", "payments", "payouts", "Connect", "fees", "credit card"],
  relatedWebsitePages: [
    "/organizer/events/[id]/edit",
    "/dashboard/stripe/return",
  ],
  relatedFeatures: ["stripe-connect", "payments"],
  relatedArticleIds: ["create-and-publish-event", "register-for-event"],
  whoThisIsFor:
    "Event organizers who charge registration fees and need to accept card payments through CarShowScout.",
  whatThisHelpsYouDo:
    "Connect your organization’s Stripe account so registrants can pay online and funds can be paid out to your club or group.",
  beforeYouStart: [
    "You need organizer access to the event or organization.",
    "Have your organization’s banking and tax details ready for Stripe’s secure onboarding.",
    "Know whether your event will charge registration fees — free events do not require Stripe.",
  ],
  stepByStepInstructions: [
    {
      title: "Open payment settings",
      body: "Edit your event and find the Stripe or Payments section on the setup checklist. Choose Connect with Stripe.",
    },
    {
      title: "Complete Stripe onboarding",
      body: "Stripe will ask for your organization name, contact details, and bank account for payouts. Follow the prompts in the secure Stripe window.",
    },
    {
      title: "Return to CarShowScout",
      body: "After Stripe approves your connection, you will return to CarShowScout. The event setup page should show Stripe as connected.",
    },
    {
      title: "Set registration tier prices",
      body: "On your registration tiers, enter prices for paid options. Registrants will pay through checkout at registration time.",
    },
    {
      title: "Test with a small registration",
      body: "If possible, run a test registration (or use a low-cost tier) to confirm checkout and confirmation emails work before you announce the event.",
    },
  ],
  whatHappensNext:
    "Registration payments flow through Stripe. View summaries in your event financial reports. Payout timing follows your Stripe account settings.",
  frequentlyAskedQuestions: [
    {
      question: "Does CarShowScout store my card or bank details?",
      answer:
        "Card payments are processed by Stripe. CarShowScout does not store full card numbers. Bank details for payouts are entered directly in Stripe.",
    },
    {
      question: "Are there platform or processing fees?",
      answer:
        "Paid registrations may include CarShowScout platform fees and standard card processing fees. The checkout summary shows registrants what they pay.",
    },
    {
      question: "Can I accept payments without Stripe?",
      answer:
        "Online card checkout requires Stripe. Free registration tiers do not need a Stripe connection.",
    },
  ],
  articleBody:
    "Connecting Stripe is the main step for paid events. Once connected, registrants pay during signup and you can track revenue from your organizer dashboard and reports.",
  chatbotSummary:
    "Organizers connect Stripe from the event edit/setup page, complete Stripe onboarding with bank details, set tier prices, and verify checkout works before opening registration.",
  chatbotKeywords: [
    "connect stripe",
    "stripe setup",
    "accept payments",
    "payouts",
    "registration fees",
  ],
  sortOrder: 40,
});
