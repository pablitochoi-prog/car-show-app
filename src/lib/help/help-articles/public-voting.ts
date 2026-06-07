import { defineArticle } from "./define-article";

export const publicVotingArticle = defineArticle({
  id: "public-voting",
  slug: "public-voting",
  title: "How public voting works",
  shortDescription:
    "Vote for your favorite vehicles at a car show using a dash card QR code or a text message.",
  audience: "SPECTATOR",
  category: "public-voting",
  keywords: ["public vote", "QR code", "SMS vote", "people's choice", "spectator"],
  relatedWebsitePages: ["/v/[vehicleEntryCode]", "/events"],
  relatedFeatures: ["public-voting", "dash-cards"],
  relatedArticleIds: ["dash-cards", "setup-public-voting"],
  whoThisIsFor:
    "Spectators, attendees, and anyone at a car show who wants to vote in People's Choice or similar public categories.",
  whatThisHelpsYouDo:
    "Cast a vote for a vehicle you like when the event has public voting open.",
  beforeYouStart: [
    "Confirm the event organizer has opened public voting — they usually announce this on site.",
    "Find the vehicle’s dash card or ask the owner for their vehicle ID code.",
    "For SMS voting, have your mobile phone ready and know the event’s voting instructions.",
  ],
  stepByStepInstructions: [
    {
      title: "Find a vehicle you want to vote for",
      body: "Walk the show and pick a vehicle in a voting category (for example, People's Choice).",
    },
    {
      title: "Vote with a QR code (website)",
      body: "Scan the QR code on the vehicle’s dash card with your phone camera. The vehicle page opens — follow the Vote button if voting is open.",
    },
    {
      title: "Or vote by text (SMS)",
      body: "If the event uses text voting, send a message with the vehicle ID to the number shown on signs or dash cards. Follow any reply prompts to pick a category.",
    },
    {
      title: "Confirm your vote counted",
      body: "The website or a reply text should confirm your vote. If you see an error, check that voting is still open and you have not already voted in that category.",
    },
  ],
  whatHappensNext:
    "Organizers tally votes and announce winners. Your vote helps decide People's Choice and similar awards.",
  frequentlyAskedQuestions: [
    {
      question: "Do I need to create an account to vote?",
      answer:
        "Often you can vote as a guest on the website or by text without signing up. The event page or signs will explain what is required.",
    },
    {
      question: "Can I vote for multiple vehicles?",
      answer:
        "Usually you get one vote per category. You may be able to vote in several categories if the event offers more than one.",
    },
    {
      question: "Why does my text vote fail?",
      answer:
        "Voting may be closed, the vehicle code may be wrong, or you may have already voted from that phone number. Double-check the code on the dash card.",
    },
  ],
  articleBody:
    "Public voting lets the crowd pick favorites. Scan the dash card QR code or text the vehicle ID — whichever method the event announces — while voting is open.",
  chatbotSummary:
    "Spectators vote by scanning a dash card QR code to open the vehicle page and tapping Vote, or by texting the vehicle ID to the event SMS number while public voting is open.",
  chatbotKeywords: [
    "how to vote",
    "public voting",
    "people's choice",
    "scan QR",
    "text to vote",
  ],
  sortOrder: 60,
});
