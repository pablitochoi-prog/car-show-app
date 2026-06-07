import { defineArticle } from "./define-article";

export const setupRegistrationTiersArticle = defineArticle({
  id: "setup-registration-tiers",
  slug: "setup-registration-tiers",
  title: "How to set up registration tiers",
  shortDescription:
    "Create registration options with names, prices, and limits so people know how to sign up.",
  audience: "ORGANIZER",
  category: "event-setup",
  keywords: ["registration tiers", "pricing", "event fees", "show car", "spectator"],
  relatedWebsitePages: [
    "/organizer/events/[id]/tiers",
    "/organizer/events/[id]/edit",
  ],
  relatedFeatures: ["registration-tiers", "event-setup"],
  relatedArticleIds: ["create-and-publish-event", "connect-stripe"],
  whoThisIsFor:
    "Event organizers setting up how attendees and show cars register for an event.",
  whatThisHelpsYouDo:
    "Add one or more registration tiers with clear names and prices so the public registration form is easy to understand.",
  beforeYouStart: [
    "Know the types of participants you expect (show cars, spectators, vendors, etc.).",
    "Connect Stripe first if any tier will charge a fee.",
  ],
  stepByStepInstructions: [
    {
      title: "Open registration tiers",
      body: "From your event organizer menu, choose Tiers or find Registration tiers on the event edit checklist.",
    },
    {
      title: "Add a tier",
      body: "Create a tier with a clear name (for example, Show Car or Spectator). Add a short description registrants will see.",
    },
    {
      title: "Set price and limits",
      body: "Enter a price for paid tiers or leave free. Set capacity limits if you need to cap how many vehicles or people can choose that tier.",
    },
    {
      title: "Save and preview",
      body: "Save tiers and preview the public event page to confirm names and prices look right.",
    },
  ],
  whatHappensNext:
    "Registrants pick a tier during signup. You can adjust tiers before registration opens; change carefully after people have already registered.",
  frequentlyAskedQuestions: [
    {
      question: "Can I have both free and paid tiers?",
      answer:
        "Yes. Many events offer a free spectator tier and a paid show-car tier.",
    },
    {
      question: "Can I add tiers after publishing?",
      answer:
        "Usually yes, but avoid removing or renaming tiers that already have registrations without a plan to contact affected registrants.",
    },
    {
      question: "Where do tier fees go?",
      answer:
        "Paid tiers collect through Stripe and appear in your financial reports. Platform and processing fees apply as shown at checkout.",
    },
  ],
  articleBody:
    "Registration tiers are the menu of ways people join your show. Clear names and prices reduce confusion and support questions on registration day.",
  chatbotSummary:
    "Organizers add registration tiers from the event Tiers page with names, descriptions, prices, and optional limits; connect Stripe for paid tiers.",
  chatbotKeywords: [
    "registration tiers",
    "tier pricing",
    "event fees",
    "show car tier",
  ],
  sortOrder: 130,
});
