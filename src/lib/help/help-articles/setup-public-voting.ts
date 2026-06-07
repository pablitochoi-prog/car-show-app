import { defineArticle } from "./define-article";

export const setupPublicVotingArticle = defineArticle({
  id: "setup-public-voting",
  slug: "setup-public-voting",
  title: "How to set up public voting",
  shortDescription:
    "Turn on People's Choice or spectator voting so attendees can vote by website or SMS during your event.",
  audience: "ORGANIZER",
  category: "public-voting",
  keywords: [
    "public voting",
    "people's choice",
    "spectator voting",
    "SMS voting",
    "QR voting",
  ],
  relatedWebsitePages: [
    "/organizer/events/[id]/awards-judging/public-voting",
    "/organizer/events/[id]/edit",
  ],
  relatedFeatures: ["public-voting", "sms-voting"],
  relatedArticleIds: ["public-voting", "dash-cards", "event-reports"],
  whoThisIsFor:
    "Event organizers who want attendees to vote for favorite vehicles without using formal judge ballots or score sheets.",
  whatThisHelpsYouDo:
    "Configure public voting categories, open voting when you are ready, and let spectators vote online or by text message.",
  beforeYouStart: [
    "Your event should be published and vehicles registered so there are entries to vote for.",
    "Decide your voting categories (for example, People's Choice, Best Paint).",
    "If using SMS voting, review your SMS program and consent settings on the event.",
  ],
  stepByStepInstructions: [
    {
      title: "Open Awards & Judging",
      body: "From your event organizer menu, go to Awards & Judging, then Public Voting.",
    },
    {
      title: "Add voting categories",
      body: "Create one or more public voting categories. Name them clearly so voters know what they are choosing (for example, People's Choice).",
    },
    {
      title: "Choose how people can vote",
      body: "Enable website voting, SMS voting, or both. SMS voting lets attendees text a vehicle code to vote; website voting uses dash card QR codes or vehicle pages.",
    },
    {
      title: "Set voting schedule",
      body: "Open voting when the show starts or at the time you announce. You can close voting when counting begins or when the event ends.",
    },
    {
      title: "Share instructions with attendees",
      body: "Announce how to vote on site — scan dash card QR codes or text the vehicle ID to the event voting number. Point people to printed dash cards for vehicle codes.",
    },
    {
      title: "Review results",
      body: "When voting closes, open Public Voting Results under Reports to see rankings and export data if needed.",
    },
  ],
  whatHappensNext:
    "Votes are tallied automatically. Use the Public Voting Results report for winners and announcements. Tie-break rules follow your category settings.",
  frequentlyAskedQuestions: [
    {
      question: "Is public voting the same as judge ballot voting?",
      answer:
        "No. Public voting is for attendees and spectators. Judge ballot voting is for assigned judges only and uses a separate setup.",
    },
    {
      question: "Can someone vote more than once?",
      answer:
        "Limits depend on your settings (for example, one vote per phone number per category). The system helps prevent duplicate SMS votes.",
    },
    {
      question: "Do voters need a CarShowScout account?",
      answer:
        "Website voting may allow guest voting depending on settings. SMS voting uses the voter’s phone number without requiring an account.",
    },
  ],
  articleBody:
    "Public voting is a popular way to run People's Choice awards. Set your categories, open voting during the show, and share simple scan-or-text instructions with the crowd.",
  chatbotSummary:
    "Organizers set up public voting under Awards & Judging → Public Voting by adding categories, enabling website and/or SMS voting, scheduling open/close times, and reviewing results in Reports.",
  chatbotKeywords: [
    "setup public voting",
    "people's choice",
    "spectator vote",
    "SMS vote",
    "QR vote",
  ],
  sortOrder: 50,
});
