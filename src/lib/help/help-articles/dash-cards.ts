import { defineArticle } from "./define-article";

export const dashCardsArticle = defineArticle({
  id: "dash-cards",
  slug: "dash-cards",
  title: "How your vehicle dash card works",
  shortDescription:
    "Understand your dash card, vehicle ID, QR code, and public vehicle page at the show.",
  audience: "REGISTRANT",
  category: "dash-cards",
  keywords: ["dash card", "QR code", "vehicle ID", "public page", "vehicle entry code"],
  relatedWebsitePages: [
    "/v/[vehicleEntryCode]",
    "/organizer/events/[id]/dash-cards",
    "/dashboard/vehicles",
  ],
  relatedFeatures: ["dash-cards", "vehicle-page"],
  relatedArticleIds: ["register-for-event", "public-voting"],
  whoThisIsFor:
    "Registered vehicle owners who receive a dash card for display at a car show.",
  whatThisHelpsYouDo:
    "Place your dash card correctly, share your vehicle page with voters and buyers, and understand what the QR code does.",
  beforeYouStart: [
    "Complete event registration so your vehicle receives a dash card entry.",
    "Print your dash card from the organizer (if they print for you) or from your registration confirmation if self-print is offered.",
  ],
  stepByStepInstructions: [
    {
      title: "Find your vehicle ID",
      body: "Each registered vehicle gets a unique vehicle ID (entry code). It appears on your dash card and registration confirmation.",
    },
    {
      title: "Print or pick up your dash card",
      body: "Display the dash card on your dashboard or window at the show. The organizer may print cards in advance — check event instructions.",
    },
    {
      title: "Understand the QR code",
      body: "Scanning the QR code opens your public vehicle page on carshowscout.com. Voters can vote from that page when public voting is open.",
    },
    {
      title: "Use your public vehicle page",
      body: "The page can show your vehicle photo, story, and for-sale status if you listed the car for sale. Buyers can send inquiries from that page.",
    },
    {
      title: "Keep the card visible",
      body: "A visible dash card helps voters, judges, and staff identify your entry quickly.",
    },
  ],
  whatHappensNext:
    "During the show, attendees may scan your QR code to vote or learn about your vehicle. After the event, your registration history stays in your dashboard.",
  frequentlyAskedQuestions: [
    {
      question: "What if my QR code does not scan?",
      answer:
        "Make sure the print is clear and flat. Voters can also enter your vehicle ID manually on the event voting page or use SMS voting if the event supports it.",
    },
    {
      question: "Can I change information on my dash card?",
      answer:
        "Update your registration or vehicle profile in your dashboard before the organizer’s edit cutoff. Reprint the dash card if details change.",
    },
    {
      question: "Is my personal email shown on the public page?",
      answer:
        "Your public page shows vehicle and show information meant for attendees. Private contact details are not exposed — buyer inquiries go through CarShowScout messaging.",
    },
  ],
  articleBody:
    "Your dash card is your vehicle’s sign at the show. The QR code links to your public page for voting and vehicle details — keep it easy to see from the aisle.",
  chatbotSummary:
    "A dash card shows a vehicle ID and QR code linking to the public vehicle page for voting and details. Registrants print or receive the card and display it at the show.",
  chatbotKeywords: [
    "dash card",
    "QR code",
    "vehicle ID",
    "vehicle page",
    "entry code",
  ],
  sortOrder: 70,
});
