import { defineArticle } from "./define-article";

export const scanDashCardQrCodeArticle = defineArticle({
  id: "scan-dash-card-qr-code",
  slug: "scan-dash-card-qr-code",
  title: "How to scan a dash card QR code",
  shortDescription:
    "Use your phone camera to open a vehicle’s public page for voting or details.",
  audience: "SPECTATOR",
  category: "dash-cards",
  keywords: ["QR code", "vehicle page", "vote", "buyer inquiry", "scan"],
  relatedWebsitePages: ["/v/[vehicleEntryCode]", "/v/[vehicleEntryCode]/sale"],
  relatedFeatures: ["dash-cards", "qr-code"],
  relatedArticleIds: ["public-voting", "dash-cards", "buyer-inquiries"],
  whoThisIsFor:
    "Spectators and attendees at a car show who want to vote, view vehicle details, or send a buyer inquiry.",
  whatThisHelpsYouDo:
    "Scan the QR code on a dash card to open the correct vehicle page without typing codes manually.",
  beforeYouStart: [
    "Allow your phone camera to open links when prompted.",
    "Make sure the dash card QR code is flat and well lit.",
  ],
  stepByStepInstructions: [
    {
      title: "Open your phone camera",
      body: "Use the built-in Camera app on iPhone or Android. Many phones scan QR codes automatically.",
    },
    {
      title: "Point at the dash card QR code",
      body: "Hold steady until a link banner appears on screen.",
    },
    {
      title: "Tap the link",
      body: "Open the CarShowScout vehicle page. You should see the vehicle’s show details.",
    },
    {
      title: "Vote or inquire",
      body: "If public voting is open, tap Vote. If the car is for sale, you may send a buyer inquiry from the page.",
    },
  ],
  whatHappensNext:
    "Your vote or inquiry is recorded according to event rules. You can scan other vehicles to vote in the same category if allowed.",
  frequentlyAskedQuestions: [
    {
      question: "My phone does not scan the code.",
      answer:
        "Try moving closer, reducing glare, or entering the vehicle ID manually if the event page offers that option.",
    },
    {
      question: "Do I need the CarShowScout app?",
      answer:
        "No app is required. The QR code opens the vehicle page in your mobile browser.",
    },
    {
      question: "Is scanning the same as SMS voting?",
      answer:
        "No. Scanning opens the website. SMS voting uses texting a code to the event number — both may be offered.",
    },
  ],
  articleBody:
    "Dash card QR codes are the fastest way to reach a vehicle’s page. Scan, tap the link, then vote or read details while you are standing at the car.",
  chatbotSummary:
    "Spectators scan a dash card QR code with a phone camera, tap the link to open the vehicle page on CarShowScout, then vote or send a buyer inquiry if available.",
  chatbotKeywords: ["scan QR code", "dash card scan", "QR vehicle page"],
  sortOrder: 230,
});
