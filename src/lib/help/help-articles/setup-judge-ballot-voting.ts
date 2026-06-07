import { defineArticle } from "./define-article";

export const setupJudgeBallotVotingArticle = defineArticle({
  id: "setup-judge-ballot-voting",
  slug: "setup-judge-ballot-voting",
  title: "How to set up judge ballot voting",
  shortDescription:
    "Configure informal judge ballot categories, vote limits, and judge assignments.",
  audience: "ORGANIZER",
  category: "judge-ballot-voting",
  keywords: [
    "judge ballot",
    "assigned judges",
    "vote allocation",
    "special judge",
    "ballot categories",
  ],
  relatedWebsitePages: [
    "/organizer/events/[id]/awards-judging/ballot",
    "/organizer/events/[id]/awards-judging",
  ],
  relatedFeatures: ["judge-ballot", "awards-judging"],
  relatedArticleIds: ["assign-judges", "review-awards-winners", "submit-judge-ballot-votes"],
  whoThisIsFor:
    "Organizers running informal judge voting where assigned judges pick favorites by category.",
  whatThisHelpsYouDo:
    "Create ballot categories, set how many votes each judge gets, assign judges, and open voting when ready.",
  beforeYouStart: [
    "Judges should be added as event staff with judge roles.",
    "Award categories and vehicles should be configured for the event.",
  ],
  stepByStepInstructions: [
    {
      title: "Open Awards & Judging",
      body: "Go to Awards & Judging and choose Judge Ballot.",
    },
    {
      title: "Create ballot categories",
      body: "Add categories judges will vote in (for example, Best in Show). Set how many picks or stars each judge may award.",
    },
    {
      title: "Assign judges",
      body: "Assign judges to categories or classes as your event requires. Special judges can be limited to specific categories.",
    },
    {
      title: "Open ballot voting",
      body: "When judging begins, open ballots so assigned judges can sign in and vote from their judge dashboard.",
    },
    {
      title: "Review results",
      body: "Use Judge Ballot Results under Reports or the ballot results page to see rankings before awards.",
    },
  ],
  whatHappensNext:
    "Judges submit votes from their devices. Results feed into awards review and trophy winner planning.",
  frequentlyAskedQuestions: [
    {
      question: "Is judge ballot the same as score sheet judging?",
      answer:
        "No. Judge ballot is informal category voting. Score sheets use structured scoring templates with deductions and classes.",
    },
    {
      question: "Can one judge vote in multiple categories?",
      answer:
        "Yes, based on your assignments and per-category vote limits.",
    },
    {
      question: "Can spectators see ballot votes live?",
      answer:
        "Ballot voting is for assigned judges. Spectators use public voting if you enable that separately.",
    },
  ],
  articleBody:
    "Judge ballot is a flexible way to let your judging team pick winners by category. Set categories and assignments first, then open voting when judging starts.",
  chatbotSummary:
    "Set up judge ballot under Awards & Judging → Judge Ballot: create categories, set vote limits, assign judges, open voting, and review results in Reports.",
  chatbotKeywords: [
    "judge ballot setup",
    "ballot voting",
    "judge assignments",
    "special judge",
  ],
  sortOrder: 160,
});
