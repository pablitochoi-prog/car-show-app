import { defineArticle } from "./define-article";

export const manageEventRegistrationsArticle = defineArticle({
  id: "manage-event-registrations",
  slug: "manage-event-registrations",
  title: "How to manage event registrations",
  shortDescription:
    "View registrants, vehicles, payment status, and registration details from your organizer dashboard.",
  audience: "ORGANIZER",
  category: "organizer-dashboard",
  keywords: ["registrations", "attendees", "vehicles", "check-in", "registrar"],
  relatedWebsitePages: [
    "/organizer/events/[id]/registrations",
    "/organizer/events/[id]/vehicle-registrations",
    "/organizer/events/[id]/registrations/[registrationId]",
  ],
  relatedFeatures: ["registrations", "vehicle-registrations"],
  relatedArticleIds: ["setup-registration-tiers", "print-dash-cards", "event-reports"],
  whoThisIsFor:
    "Event organizers and registrars managing who has signed up and what vehicles are entered.",
  whatThisHelpsYouDo:
    "Search registrations, open individual records, track payments, and prepare for check-in and dash card printing.",
  beforeYouStart: [
    "You need organizer or registrar staff access to the event.",
    "Registration should be open or have at least some entries to manage.",
  ],
  stepByStepInstructions: [
    {
      title: "Open Registrations",
      body: "From the event organizer menu, choose Registrations for people-centric lists or Vehicle registrations for show cars.",
    },
    {
      title: "Search and filter",
      body: "Use search and column filters to find a name, vehicle, payment status, or tier.",
    },
    {
      title: "Open a registration",
      body: "Select a row to see contact details, vehicles, payment history, and notes your staff can use on site.",
    },
    {
      title: "Export if needed",
      body: "Use Registration Detail under Reports or export tools on the registrations page when you need a spreadsheet for check-in.",
    },
  ],
  whatHappensNext:
    "Use the list for check-in, dash card printing, and answering registrant questions. New registrations appear as people complete signup.",
  frequentlyAskedQuestions: [
    {
      question: "Can I edit a registrant’s information?",
      answer:
        "Organizers can often view full details; registrants usually edit their own entries. Contact support or use staff tools per your event policy.",
    },
    {
      question: "How do I see who has not paid?",
      answer:
        "Filter registrations by payment status or open Financial Summary in Reports for totals.",
    },
    {
      question: "What is the difference between registrations and vehicle registrations?",
      answer:
        "Registrations focus on people and orders. Vehicle registrations focus on show cars and vehicle-level fields for judging and dash cards.",
    },
  ],
  articleBody:
    "Your registrations lists are the day-of roster. Keep them handy for check-in, printing, and quick answers when someone asks if they are on the list.",
  chatbotSummary:
    "Organizers manage registrations from Registrations and Vehicle registrations pages, search and filter entries, open details, and export via reports for check-in.",
  chatbotKeywords: [
    "manage registrations",
    "registration list",
    "vehicle registrations",
    "check-in list",
  ],
  sortOrder: 140,
});
