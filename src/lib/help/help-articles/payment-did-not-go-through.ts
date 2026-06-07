import { defineArticle } from "./define-article";

export const paymentDidNotGoThroughArticle = defineArticle({
  id: "payment-did-not-go-through",
  slug: "payment-did-not-go-through",
  title: "My payment did not go through",
  shortDescription:
    "Fix failed checkout and confirm whether your registration completed.",
  audience: "GENERAL",
  category: "troubleshooting",
  keywords: ["payment failed", "Stripe", "checkout", "credit card", "declined"],
  relatedWebsitePages: [
    "/events/[id]/register",
    "/dashboard/registrations",
    "/events/[id]/register/checkout-canceled",
  ],
  relatedFeatures: ["checkout", "stripe"],
  relatedArticleIds: ["register-for-event", "connect-stripe", "confirmation-email-not-received"],
  whoThisIsFor:
    "Registrants whose card payment failed or who are unsure if checkout finished.",
  whatThisHelpsYouDo:
    "Retry payment safely, avoid duplicate charges, and confirm registration status.",
  beforeYouStart: [
    "Have an alternate card or payment method ready if possible.",
    "Sign in to the same account you used to start registration.",
  ],
  stepByStepInstructions: [
    {
      title: "Check your dashboard first",
      body: "Open Registrations and see if the event shows as paid or incomplete. Do not pay twice if registration already succeeded.",
    },
    {
      title: "Return to checkout",
      body: "If status is unpaid, open the event registration again and continue to checkout.",
    },
    {
      title: "Verify card details",
      body: "Re-enter card number, expiration, ZIP, and CVC carefully. Make sure billing ZIP matches your bank records.",
    },
    {
      title: "Try another card or contact your bank",
      body: "Some banks block first-time online charges. Ask the bank to allow the payment, then retry.",
    },
    {
      title: "Contact the organizer if still stuck",
      body: "Send your name and vehicle so they can check whether a partial payment or duplicate attempt exists.",
    },
  ],
  whatHappensNext:
    "Successful payment shows as paid in your dashboard and in the organizer’s registration list. You should receive a confirmation email when payment completes.",
  frequentlyAskedQuestions: [
    {
      question: "Was I charged if checkout failed?",
      answer:
        "Usually no completed registration means no successful charge, but your bank may show a temporary hold. It typically drops off in a few days if the payment did not complete.",
    },
    {
      question: "Can I pay at the gate instead?",
      answer:
        "Only if the event offers that option. Online-required events must finish checkout on CarShowScout.",
    },
    {
      question: "The organizer sees paid but I do not.",
      answer:
        "Sign in with the email used at checkout or contact support to locate the registration.",
    },
  ],
  articleBody:
    "A failed payment usually means registration is not complete. Check your dashboard before paying again, fix card issues, and reach out to the organizer if you need help.",
  chatbotSummary:
    "For failed payments, check Dashboard → Registrations for paid status, retry checkout with correct card details or another card, contact bank if blocked, and ask organizer before paying twice.",
  chatbotKeywords: [
    "payment failed",
    "checkout error",
    "card declined",
    "stripe payment",
  ],
  sortOrder: 250,
});
