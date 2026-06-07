import { defineArticle } from "./define-article";

export const completeScoreSheetJudgingArticle = defineArticle({
  id: "complete-score-sheet-judging",
  slug: "complete-score-sheet-judging",
  title: "How to complete score sheet judging",
  shortDescription:
    "Enter scores, deductions, and comments on assigned score sheets and submit when done.",
  audience: "JUDGE",
  category: "score-sheet-judging",
  keywords: ["score sheet", "deductions", "comments", "submit score", "judging"],
  relatedWebsitePages: ["/judge/events/[id]/score-sheets", "/judge/events/[id]/score-sheets/[sheetId]"],
  relatedFeatures: ["score-sheets"],
  relatedArticleIds: ["judge-access-assigned-events", "setup-score-sheet-judging"],
  whoThisIsFor:
    "Judges completing structured score sheets with subcategories, deductions, and class scoring.",
  whatThisHelpsYouDo:
    "Score each vehicle on your assigned sheets, record deductions and notes, and submit finished sheets.",
  beforeYouStart: [
    "Sign in and open the event from the judge dashboard.",
    "Review the judging template or instructions from the head judge.",
  ],
  stepByStepInstructions: [
    {
      title: "Open Score Sheets",
      body: "From the judge dashboard for your event, choose Score Sheets.",
    },
    {
      title: "Open your assigned sheet",
      body: "Select the sheet assigned to you. You should see vehicles or entries for that class.",
    },
    {
      title: "Enter scores and deductions",
      body: "Work through subcategories, enter scores, and apply deductions where rules require. Add comments if helpful for the head judge.",
    },
    {
      title: "Save progress",
      body: "Save as you go if the form supports drafts so you do not lose work.",
    },
    {
      title: "Submit the sheet",
      body: "Submit when every required field is complete. Submitted sheets flow to organizer results.",
    },
  ],
  whatHappensNext:
    "Organizers review class totals in score sheet results and awards planning. Contact the head judge if you need to correct a submission.",
  frequentlyAskedQuestions: [
    {
      question: "Can I edit after submitting?",
      answer:
        "Depends on event settings. Ask the head judge before show close if you need a correction.",
    },
    {
      question: "What if a vehicle is a no-show?",
      answer:
        "Follow your event’s no-show policy — often mark absent or skip per head judge instructions.",
    },
    {
      question: "The sheet looks incomplete on my phone.",
      answer:
        "Try rotating to landscape or use a tablet. Contact the organizer if a field will not load.",
    },
  ],
  articleBody:
    "Score sheet judging takes focus and consistency. Save often, follow your club’s deduction rules, and submit only when the sheet is complete.",
  chatbotSummary:
    "Judges open assigned score sheets from the judge dashboard, enter scores and deductions per subcategory, save drafts, and submit completed sheets.",
  chatbotKeywords: [
    "complete score sheet",
    "score sheet judging",
    "deductions",
    "submit scores",
  ],
  sortOrder: 220,
});
