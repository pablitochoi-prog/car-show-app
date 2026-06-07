import { defineArticle } from "./define-article";

export const reviewAwardsWinnersArticle = defineArticle({
  id: "review-awards-winners",
  slug: "review-awards-winners",
  title: "How to review awards and winners",
  shortDescription:
    "Review projected and finalized trophy winners from voting and judging results.",
  audience: "ORGANIZER",
  category: "awards-judging",
  keywords: ["awards", "winners", "results", "trophies", "trophy winners"],
  relatedWebsitePages: [
    "/organizer/events/[id]/awards-judging/trophy-winners",
    "/organizer/events/[id]/reports",
  ],
  relatedFeatures: ["awards", "trophy-winners"],
  relatedArticleIds: [
    "setup-judge-ballot-voting",
    "setup-public-voting",
    "setup-score-sheet-judging",
    "event-reports",
  ],
  whoThisIsFor:
    "Organizers and awards chairs preparing announcements, name cards, and trophy presentations.",
  whatThisHelpsYouDo:
    "See who is leading or placed for each award, adjust overrides if your event allows, and finalize results for announcements.",
  beforeYouStart: [
    "Voting or judging should be underway or complete for meaningful results.",
    "Know whether your event uses projected picks before finalization.",
  ],
  stepByStepInstructions: [
    {
      title: "Open Trophy Winners",
      body: "From Awards & Judging, choose Trophy Winners to see placements by award group.",
    },
    {
      title: "Compare source results",
      body: "Cross-check with Public Voting Results, Judge Ballot Results, or Score Sheet Results in Reports if an award pulls from those methods.",
    },
    {
      title: "Apply overrides if needed",
      body: "If your event allows manual overrides or vacant slots, update placements before you announce winners.",
    },
    {
      title: "Finalize when ready",
      body: "When results are official, finalize awards voting status so reports and announcements show final winners.",
    },
    {
      title: "Print or export for ceremonies",
      body: "Use Awards / Winners report print or CSV export for announcer scripts and name cards.",
    },
  ],
  whatHappensNext:
    "Announce winners at your ceremony. Registrants may see awards in their dashboard when your event shares results.",
  frequentlyAskedQuestions: [
    {
      question: "What does projected winner mean?",
      answer:
        "Projected means results are calculated but not yet finalized. Finalize when you are ready to lock placements.",
    },
    {
      question: "Can one vehicle win multiple awards?",
      answer:
        "Yes, unless your event rules restrict duplicate winners. Review each award group separately.",
    },
    {
      question: "Where do public voting winners appear?",
      answer:
        "Public voting rankings appear in the Public Voting Results report and may map to trophy placements you configure.",
    },
  ],
  articleBody:
    "Awards review brings judging and voting together. Check Trophy Winners, confirm sources in Reports, then finalize before you read names from the stage.",
  chatbotSummary:
    "Review awards from Trophy Winners and Reports, cross-check voting and score sheet results, apply overrides if allowed, finalize placements, and export for ceremonies.",
  chatbotKeywords: [
    "awards winners",
    "trophy winners",
    "finalize awards",
    "projected winner",
  ],
  sortOrder: 190,
});
