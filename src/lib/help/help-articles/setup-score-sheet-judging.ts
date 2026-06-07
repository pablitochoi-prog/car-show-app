import { defineArticle } from "./define-article";

export const setupScoreSheetJudgingArticle = defineArticle({
  id: "setup-score-sheet-judging",
  slug: "setup-score-sheet-judging",
  title: "How to set up score sheet judging",
  shortDescription:
    "Configure judging classes, score sheet templates, and assignments for structured judging.",
  audience: "ORGANIZER",
  category: "score-sheet-judging",
  keywords: [
    "score sheets",
    "judging templates",
    "PCA",
    "AACA",
    "deductions",
    "judging classes",
  ],
  relatedWebsitePages: [
    "/organizer/events/[id]/awards-judging/score-sheets",
    "/organizer/events/[id]/awards-judging/score-sheets/assignments",
  ],
  relatedFeatures: ["score-sheets", "judging-templates"],
  relatedArticleIds: ["assign-judges", "complete-score-sheet-judging", "review-awards-winners"],
  whoThisIsFor:
    "Organizers running formal score sheet judging with classes, subcategories, and deductions.",
  whatThisHelpsYouDo:
    "Pick or customize a judging template, map vehicles to classes, assign judges, and open score sheets for data entry.",
  beforeYouStart: [
    "Vehicles should be registered and classified for judging.",
    "Know which judging standard your event uses (club template, custom template, etc.).",
  ],
  stepByStepInstructions: [
    {
      title: "Open Score Sheets",
      body: "From Awards & Judging, choose Score Sheets.",
    },
    {
      title: "Choose a judging template",
      body: "Select a starter template or your club’s template. Review classes, subcategories, and maximum scores.",
    },
    {
      title: "Map vehicles to classes",
      body: "Assign registered vehicles to judging classes so each score sheet applies to the right group.",
    },
    {
      title: "Assign judges to sheets",
      body: "Use Assignments to give each judge the score sheets they will complete.",
    },
    {
      title: "Open judging and monitor progress",
      body: "When judging starts, judges enter scores and deductions from their judge dashboard. Track completion in Judge Progress reports.",
    },
  ],
  whatHappensNext:
    "Completed score sheets roll up to class results and awards. Use score sheet results pages for detail and exports.",
  frequentlyAskedQuestions: [
    {
      question: "Can I edit a template after judging starts?",
      answer:
        "Avoid major template changes after scores exist. Small fixes may be possible — plan templates before opening judging.",
    },
    {
      question: "Do judges need accounts?",
      answer:
        "Yes. Judges sign in to CarShowScout and open assigned score sheets from the judge dashboard.",
    },
    {
      question: "Where do I see final class scores?",
      answer:
        "Open Score Sheet Results under Awards & Judging or the scorecards summary in Reports.",
    },
  ],
  articleBody:
    "Score sheet judging supports detailed club standards. Spend time on templates and class assignments up front so judges can focus on scoring on show day.",
  chatbotSummary:
    "Organizers set up score sheets from Awards & Judging: pick a template, map vehicles to classes, assign judges, open judging, and monitor via Judge Progress reports.",
  chatbotKeywords: [
    "score sheet setup",
    "judging template",
    "judging classes",
    "deductions",
  ],
  sortOrder: 170,
});
