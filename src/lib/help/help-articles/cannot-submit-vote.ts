import { defineArticle } from "./define-article";

export const cannotSubmitVoteArticle = defineArticle({
  id: "cannot-submit-vote",
  slug: "cannot-submit-vote",
  title: "I cannot submit my vote",
  shortDescription:
    "Fix common public voting problems on the website or by SMS.",
  audience: "SPECTATOR",
  category: "troubleshooting",
  keywords: ["voting error", "already voted", "phone number", "QR code", "vote failed"],
  relatedWebsitePages: ["/v/[vehicleEntryCode]", "/events"],
  relatedFeatures: ["public-voting", "sms-voting"],
  relatedArticleIds: ["public-voting", "scan-dash-card-qr-code"],
  whoThisIsFor:
    "Spectators trying to vote online or by text at a car show.",
  whatThisHelpsYouDo:
    "Figure out why a vote will not go through and try again while voting is still open.",
  beforeYouStart: [
    "Confirm the organizer announced that voting is open.",
    "Have the correct vehicle ID from the dash card.",
  ],
  stepByStepInstructions: [
    {
      title: "Check voting hours",
      body: "Voting may not be open yet or may have closed. Look for signs at the show or ask staff.",
    },
    {
      title: "Verify the vehicle code",
      body: "Re-read the vehicle ID on the dash card. Avoid confusing the letter O with the number 0.",
    },
    {
      title: "Website voting: refresh the vehicle page",
      body: "Scan the QR code again or reload the page. Tap Vote only once and wait for confirmation.",
    },
    {
      title: "SMS voting: check your message format",
      body: "Send only the vehicle code or the format shown on event signs. Use the correct event voting number.",
    },
    {
      title: "Already voted message",
      body: "Many events allow one vote per phone per category. You may have already voted — that is normal.",
    },
  ],
  whatHappensNext:
    "If voting is open and your code is correct, your vote should confirm on screen or by reply text. Ask event staff if errors continue.",
  frequentlyAskedQuestions: [
    {
      question: "Why does it say I already voted?",
      answer:
        "The event limits duplicate votes from the same phone or browser. You may have voted earlier in that category.",
    },
    {
      question: "Can I change my vote?",
      answer:
        "Most events do not allow vote changes after submit. Check with the organizer.",
    },
    {
      question: "SMS not replying?",
      answer:
        "Check signal strength, confirm you texted the right number, and wait a minute. Carrier delays happen.",
    },
  ],
  articleBody:
    "Most voting errors come from closed voting, a mistyped vehicle code, or a duplicate vote limit. Double-check the dash card and try again while voting is open.",
  chatbotSummary:
    "If a public vote fails, confirm voting is open, verify vehicle ID, retry website or SMS format, and note one-vote-per-phone limits may block duplicate votes.",
  chatbotKeywords: [
    "cannot vote",
    "voting error",
    "already voted",
    "SMS vote failed",
  ],
  sortOrder: 270,
});
