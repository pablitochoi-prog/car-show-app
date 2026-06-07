import { defineArticle } from "./define-article";

export const printDashCardsArticle = defineArticle({
  id: "print-dash-cards",
  slug: "print-dash-cards",
  title: "How to print dash cards",
  shortDescription:
    "Print vehicle dash cards with QR codes and vehicle IDs before show day.",
  audience: "ORGANIZER",
  category: "dash-cards",
  keywords: ["print", "dash cards", "QR codes", "vehicle ID", "window card"],
  relatedWebsitePages: ["/organizer/events/[id]/dash-cards"],
  relatedFeatures: ["dash-cards", "printing"],
  relatedArticleIds: ["dash-cards", "setup-public-voting", "manage-event-registrations"],
  whoThisIsFor:
    "Event organizers preparing dash cards for registered show vehicles.",
  whatThisHelpsYouDo:
    "Generate and print dash cards so each vehicle has a visible QR code and entry ID at the show.",
  beforeYouStart: [
    "Vehicles should be registered so entry codes exist.",
    "Confirm vehicle details are final enough for printing — major edits may require reprints.",
  ],
  stepByStepInstructions: [
    {
      title: "Open Dash Cards",
      body: "From the event organizer menu, choose Dash Cards.",
    },
    {
      title: "Review the vehicle list",
      body: "Check that registered vehicles appear with correct names and entry codes.",
    },
    {
      title: "Print or export",
      body: "Use the print action to print individual cards or batches. Use your browser print dialog and choose the right paper size.",
    },
    {
      title: "Distribute at check-in",
      body: "Hand cards to entrants at check-in or mail them in advance if your event allows.",
    },
  ],
  whatHappensNext:
    "Entrants display dash cards on their vehicles. Voters and buyers scan QR codes linked to each vehicle’s public page.",
  frequentlyAskedQuestions: [
    {
      question: "Can registrants print their own cards?",
      answer:
        "Some events let owners print from their registration confirmation. Check your event settings and instructions.",
    },
    {
      question: "What if a vehicle is added after I print?",
      answer:
        "Print additional cards for new registrations from the Dash Cards page.",
    },
    {
      question: "Do QR codes change if vehicle details are edited?",
      answer:
        "The vehicle entry code usually stays the same; the public page content updates when details change.",
    },
  ],
  articleBody:
    "Printed dash cards are the on-site sign for each vehicle. Print before the crowd arrives so voting and buyer inquiries work smoothly.",
  chatbotSummary:
    "Organizers print dash cards from the event Dash Cards page, review registered vehicles, print batches, and distribute at check-in.",
  chatbotKeywords: ["print dash cards", "QR code print", "vehicle dash card"],
  sortOrder: 150,
});
